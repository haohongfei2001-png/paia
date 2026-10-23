// Actual dependency case. Execute only after original Source-linked placement is implemented.
import test from 'node:test';
import {roundTrip} from '../../extension/tests/harness/context-mutation-shadow.mjs';
test('NOW automatic lineage and manual mix original shadow round trip',t=>roundTrip(t,true));
