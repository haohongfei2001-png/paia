// Offline synthetic experiment only. Never packaged into the extension.
import Foundation
import NaturalLanguage
import Darwin
struct Sample: Decodable {let text:String;let lang:String}
struct Input: Decodable {let samples:[Sample];let prototypes:[String:[String:[String]]]}
let input=try JSONDecoder().decode(Input.self,from:Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1])))
func unit(_ v:[Double])->[Double]{let n=sqrt(v.reduce(0){$0+$1*$1});return n>0 ? v.map{$0/n}:v}
let labels=["pure_control","substantive","ambiguous"]
let cold=ProcessInfo.processInfo.systemUptime
var models:[String:NLEmbedding]=[:],centers:[String:[[Double]]]=[:]
for (name,lang) in [("en",NLLanguage.english),("zh",NLLanguage.simplifiedChinese)] {
 if let e=NLEmbedding.sentenceEmbedding(for:lang) {
  models[name]=e
  centers[name]=labels.map{label in
   let vectors=(input.prototypes[name]?[label] ?? []).compactMap{e.vector(for:$0)}.map{unit($0)}
   var sum=[Double](repeating:0,count:e.dimension)
   for v in vectors {for i in sum.indices {sum[i]+=v[i]}}
   return unit(sum)
  }
 }
}
let loadMs=(ProcessInfo.processInfo.systemUptime-cold)*1000
var output:[[String:Any]]=[],latencies:[Double]=[]
let cpu=clock()
for sample in input.samples {
 let start=ProcessInfo.processInfo.systemUptime
 var label="ambiguous",confidence=0.0
 if let e=models[sample.lang],let raw=e.vector(for:sample.text),let refs=centers[sample.lang] {
  let v=unit(raw),scores=refs.map{ref in zip(v,ref).reduce(0){$0+$1.0*$1.1}}
  let weights=scores.map{exp($0/0.1)},total=weights.reduce(0,+)
  let best=scores.indices.max{scores[$0]<scores[$1]}!
  label=labels[best];confidence=weights[best]/total
 }
 latencies.append((ProcessInfo.processInfo.systemUptime-start)*1000)
 output.append(["label":label,"confidence":confidence])
}
let cpuMs=Double(clock()-cpu)/Double(CLOCKS_PER_SEC)*1000
var usage=rusage();getrusage(RUSAGE_SELF,&usage)
latencies.sort()
let result:[String:Any]=["predictions":output,"samples":output.count,"modelAvailable":models.keys.sorted(),"dimensions":models.mapValues{$0.dimension},"loadMs":loadMs,"inferenceCpuMs":cpuMs,"p50Ms":latencies[latencies.count/2],"p95Ms":latencies[min(latencies.count-1,Int(Double(latencies.count)*0.95))],"peakProcessRSSBytes":usage.ru_maxrss,"confidenceMeaning":"uncalibrated cosine-softmax score","downloadedModel":false]
let data=try JSONSerialization.data(withJSONObject:result,options:[.sortedKeys])
try data.write(to:URL(fileURLWithPath:CommandLine.arguments[2]))
