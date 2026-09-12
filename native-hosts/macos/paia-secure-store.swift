import Foundation
import Security
import CryptoKit

let protocolVersion = 1
let providerId = "paia.macos.secure_enclave.v1"
let rootService = "com.paia.secure_store.root_keys"
let signingTagPrefix = "com.paia.secure_store.signing."
let maxSecretBytes = 256 * 1024

struct HostFailure: Error {
    let code: String
}

func fail(_ code: String) throws -> Never { throw HostFailure(code: code) }

func base64url(_ data: Data) -> String {
    data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
}

func unbase64url(_ value: String) throws -> Data {
    let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
    guard !value.isEmpty, value.unicodeScalars.allSatisfy({ allowed.contains($0) }) else { try fail("SECURE_NATIVE_HOST_PROTOCOL_INVALID") }
    var raw = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    raw += String(repeating: "=", count: (4 - raw.count % 4) % 4)
    guard let data = Data(base64Encoded: raw) else { try fail("SECURE_NATIVE_HOST_PROTOCOL_INVALID") }
    return data
}

func opaque(_ value: Any?) -> String? {
    guard let value = value as? String, value.count >= 3, value.count <= 160 else { return nil }
    let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.:-")
    return value.unicodeScalars.allSatisfy({ allowed.contains($0) }) ? value : nil
}

struct Slot {
    let accountId: String
    let deviceId: String
    let secretClass: String
    let keyVersion: Int?
}

func parseSlot(_ value: Any?) throws -> Slot {
    guard let row = value as? [String: Any], row["version"] as? Int == 1,
          let accountId = opaque(row["accountId"]), let deviceId = opaque(row["deviceId"]),
          let secretClass = row["secretClass"] as? String,
          ["root_keyring", "device_signing_private"].contains(secretClass) else { try fail("SECURE_SECRET_SLOT_INVALID") }
    let keyVersion = row["keyVersion"] as? Int
    if secretClass == "root_keyring" {
        guard let version = keyVersion, version >= 1, version <= 1_000_000 else { try fail("SECURE_SECRET_SLOT_INVALID") }
    } else if row["keyVersion"] != nil && !(row["keyVersion"] is NSNull) {
        try fail("SECURE_SECRET_SLOT_INVALID")
    }
    return Slot(accountId: accountId, deviceId: deviceId, secretClass: secretClass, keyVersion: keyVersion)
}

func slotFingerprint(_ slot: Slot) -> String {
    let text = "\(slot.accountId)|\(slot.deviceId)|\(slot.secretClass)|\(slot.keyVersion.map(String.init) ?? "")"
    return SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
}

func rootAccount(_ slot: Slot) throws -> String {
    guard slot.secretClass == "root_keyring" else { try fail("SECURE_NON_EXPORTABLE_SIGNING_KEY_REQUIRED") }
    return slotFingerprint(slot)
}

func signingTag(_ slot: Slot) throws -> Data {
    guard slot.secretClass == "device_signing_private" else { try fail("SECURE_SIGNING_SLOT_REQUIRED") }
    return Data((signingTagPrefix + slotFingerprint(slot)).utf8)
}

func writeRootSecret(slot: Slot, data: Data) throws {
    guard !data.isEmpty, data.count <= maxSecretBytes else { try fail("SECURE_SECRET_INVALID") }
    let account = try rootAccount(slot)
    let query: [CFString: Any] = [kSecClass: kSecClassGenericPassword, kSecAttrService: rootService, kSecAttrAccount: account]
    let update: [CFString: Any] = [kSecValueData: data]
    var status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
    if status == errSecItemNotFound {
        var add = query
        add[kSecValueData] = data
        add[kSecAttrAccessible] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        status = SecItemAdd(add as CFDictionary, nil)
        if status == errSecDuplicateItem { status = SecItemUpdate(query as CFDictionary, update as CFDictionary) }
    }
    guard status == errSecSuccess else { try fail("SECURE_KEYCHAIN_WRITE_FAILED") }
}

func readRootSecret(slot: Slot) throws -> Data? {
    let account = try rootAccount(slot)
    let query: [CFString: Any] = [kSecClass: kSecClassGenericPassword, kSecAttrService: rootService, kSecAttrAccount: account, kSecReturnData: true, kSecMatchLimit: kSecMatchLimitOne]
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = item as? Data else { try fail("SECURE_KEYCHAIN_READ_FAILED") }
    return data
}

func deleteRootSecret(slot: Slot) throws {
    let account = try rootAccount(slot)
    let query: [CFString: Any] = [kSecClass: kSecClassGenericPassword, kSecAttrService: rootService, kSecAttrAccount: account]
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { try fail("SECURE_KEYCHAIN_DELETE_FAILED") }
}

func lookupSigningKey(slot: Slot) throws -> SecKey? {
    let tag = try signingTag(slot)
    let query: [CFString: Any] = [
        kSecClass: kSecClassKey,
        kSecAttrApplicationTag: tag,
        kSecAttrKeyType: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeyClass: kSecAttrKeyClassPrivate,
        kSecReturnRef: true,
        kSecMatchLimit: kSecMatchLimitOne
    ]
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let item else { try fail("SECURE_SIGNING_KEY_LOOKUP_FAILED") }
    return (item as! SecKey)
}

func secureEnclaveAvailable() -> Bool {
    var accessError: Unmanaged<CFError>?
    guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, &accessError) else { return false }
    let attributes: [CFString: Any] = [
        kSecAttrKeyType: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeySizeInBits: 256,
        kSecAttrTokenID: kSecAttrTokenIDSecureEnclave,
        kSecPrivateKeyAttrs: [kSecAttrIsPermanent: false, kSecAttrAccessControl: access]
    ]
    var error: Unmanaged<CFError>?
    return SecKeyCreateRandomKey(attributes as CFDictionary, &error) != nil
}

func createSigningKey(slot: Slot) throws -> SecKey {
    if let existing = try lookupSigningKey(slot: slot) { return existing }
    guard secureEnclaveAvailable() else { try fail("SECURE_ENCLAVE_UNAVAILABLE") }
    var accessError: Unmanaged<CFError>?
    guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenUnlockedThisDeviceOnly, .privateKeyUsage, &accessError) else { try fail("SECURE_SIGNING_ACCESS_CONTROL_FAILED") }
    let attributes: [CFString: Any] = [
        kSecAttrKeyType: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeySizeInBits: 256,
        kSecAttrTokenID: kSecAttrTokenIDSecureEnclave,
        kSecPrivateKeyAttrs: [kSecAttrIsPermanent: true, kSecAttrApplicationTag: try signingTag(slot), kSecAttrAccessControl: access]
    ]
    var error: Unmanaged<CFError>?
    if let key = SecKeyCreateRandomKey(attributes as CFDictionary, &error) { return key }
    if let raced = try lookupSigningKey(slot: slot) { return raced }
    try fail("SECURE_SIGNING_KEY_CREATE_FAILED")
}

func publicJwk(privateKey: SecKey) throws -> [String: Any] {
    guard let publicKey = SecKeyCopyPublicKey(privateKey) else { try fail("SECURE_SIGNING_PUBLIC_KEY_FAILED") }
    var error: Unmanaged<CFError>?
    guard let raw = SecKeyCopyExternalRepresentation(publicKey, &error) as Data?, raw.count == 65, raw.first == 0x04 else { try fail("SECURE_SIGNING_PUBLIC_KEY_FAILED") }
    let x = raw.subdata(in: 1..<33), y = raw.subdata(in: 33..<65)
    return ["kty": "EC", "crv": "P-256", "x": base64url(x), "y": base64url(y), "ext": true, "key_ops": ["verify"]]
}

func readDerLength(_ bytes: [UInt8], _ index: inout Int) throws -> Int {
    guard index < bytes.count else { try fail("SECURE_SIGNATURE_ENCODING_FAILED") }
    let first = Int(bytes[index]); index += 1
    if first < 0x80 { return first }
    let count = first & 0x7f
    guard count > 0, count <= 2, index + count <= bytes.count else { try fail("SECURE_SIGNATURE_ENCODING_FAILED") }
    var length = 0
    for _ in 0..<count { length = (length << 8) | Int(bytes[index]); index += 1 }
    return length
}

func normalizeDerInteger(_ value: ArraySlice<UInt8>) throws -> [UInt8] {
    var bytes = Array(value)
    while bytes.count > 32 && bytes.first == 0 { bytes.removeFirst() }
    guard bytes.count <= 32 else { try fail("SECURE_SIGNATURE_ENCODING_FAILED") }
    return Array(repeating: 0, count: 32 - bytes.count) + bytes
}

func derSignatureToRaw(_ der: Data) throws -> Data {
    let bytes = [UInt8](der); var i = 0
    guard i < bytes.count, bytes[i] == 0x30 else { try fail("SECURE_SIGNATURE_ENCODING_FAILED") }; i += 1
    let seqLength = try readDerLength(bytes, &i)
    guard i + seqLength == bytes.count, i < bytes.count, bytes[i] == 0x02 else { try fail("SECURE_SIGNATURE_ENCODING_FAILED") }; i += 1
    let rLength = try readDerLength(bytes, &i); guard rLength > 0, i + rLength <= bytes.count else { try fail("SECURE_SIGNATURE_ENCODING_FAILED") }
    let r = try normalizeDerInteger(bytes[i..<(i + rLength)]); i += rLength
    guard i < bytes.count, bytes[i] == 0x02 else { try fail("SECURE_SIGNATURE_ENCODING_FAILED") }; i += 1
    let sLength = try readDerLength(bytes, &i); guard sLength > 0, i + sLength == bytes.count else { try fail("SECURE_SIGNATURE_ENCODING_FAILED") }
    let s = try normalizeDerInteger(bytes[i..<(i + sLength)])
    return Data(r + s)
}

func sign(slot: Slot, payload: Data) throws -> Data {
    guard let key = try lookupSigningKey(slot: slot) else { try fail("SECURE_SIGNING_KEY_NOT_FOUND") }
    var error: Unmanaged<CFError>?
    guard SecKeyIsAlgorithmSupported(key, .sign, .ecdsaSignatureMessageX962SHA256),
          let der = SecKeyCreateSignature(key, .ecdsaSignatureMessageX962SHA256, payload as CFData, &error) as Data? else { try fail("SECURE_SIGNING_FAILED") }
    return try derSignatureToRaw(der)
}

func deleteSigningKey(slot: Slot) throws {
    let tag = try signingTag(slot)
    let query: [CFString: Any] = [kSecClass: kSecClassKey, kSecAttrApplicationTag: tag, kSecAttrKeyType: kSecAttrKeyTypeECSECPrimeRandom, kSecAttrKeyClass: kSecAttrKeyClassPrivate]
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { try fail("SECURE_SIGNING_KEY_DELETE_FAILED") }
}

func handle(_ request: [String: Any]) throws -> [String: Any] {
    guard request["version"] as? Int == protocolVersion, let operation = request["operation"] as? String else { try fail("SECURE_NATIVE_HOST_PROTOCOL_INVALID") }
    if operation == "probe" {
        let enclave = secureEnclaveAvailable()
        return ["ok": true, "version": protocolVersion, "platform": "macos", "providerId": providerId, "secureEnclaveAvailable": enclave, "isolatedFromAppStorage": true, "supportsAtomicReplace": true, "supportsDelete": true, "supportsNonExportableSigningKey": enclave]
    }
    let slot = try parseSlot(request["slot"])
    switch operation {
    case "writeSecret":
        guard let encoded = request["secret"] as? String else { try fail("SECURE_NATIVE_HOST_PROTOCOL_INVALID") }
        try writeRootSecret(slot: slot, data: try unbase64url(encoded)); return ["ok": true]
    case "readSecret":
        let secret = try readRootSecret(slot: slot)
        return ["ok": true, "secret": secret.map(base64url) ?? NSNull()]
    case "deleteSecret":
        try deleteRootSecret(slot: slot); return ["ok": true]
    case "createSigningKey":
        return ["ok": true, "publicKeyJwk": try publicJwk(privateKey: createSigningKey(slot: slot))]
    case "getSigningPublicKey":
        guard let key = try lookupSigningKey(slot: slot) else { try fail("SECURE_SIGNING_KEY_NOT_FOUND") }
        return ["ok": true, "publicKeyJwk": try publicJwk(privateKey: key)]
    case "sign":
        guard let encoded = request["payload"] as? String else { try fail("SECURE_NATIVE_HOST_PROTOCOL_INVALID") }
        return ["ok": true, "signature": base64url(try sign(slot: slot, payload: try unbase64url(encoded)))]
    case "deleteSigningKey":
        try deleteSigningKey(slot: slot); return ["ok": true]
    default:
        try fail("SECURE_NATIVE_HOST_OPERATION_INVALID")
    }
}

func readMessage() throws -> [String: Any] {
    let input = FileHandle.standardInput
    let header = input.readData(ofLength: 4)
    guard header.count == 4 else { try fail("SECURE_NATIVE_HOST_PROTOCOL_INVALID") }
    let h = [UInt8](header)
    let length = Int(UInt32(h[0]) | UInt32(h[1]) << 8 | UInt32(h[2]) << 16 | UInt32(h[3]) << 24)
    guard length > 0, length <= 4 * 1024 * 1024 else { try fail("SECURE_NATIVE_HOST_PROTOCOL_INVALID") }
    let body = input.readData(ofLength: length)
    guard body.count == length, let object = try JSONSerialization.jsonObject(with: body) as? [String: Any] else { try fail("SECURE_NATIVE_HOST_PROTOCOL_INVALID") }
    return object
}

func writeMessage(_ object: [String: Any]) {
    guard let body = try? JSONSerialization.data(withJSONObject: object), body.count <= 1024 * 1024 else { return }
    var length = UInt32(body.count).littleEndian
    let header = withUnsafeBytes(of: &length) { Data($0) }
    FileHandle.standardOutput.write(header); FileHandle.standardOutput.write(body)
}

do {
    writeMessage(try handle(readMessage()))
} catch let error as HostFailure {
    writeMessage(["ok": false, "code": error.code])
} catch {
    writeMessage(["ok": false, "code": "SECURE_NATIVE_HOST_INTERNAL_ERROR"])
}
