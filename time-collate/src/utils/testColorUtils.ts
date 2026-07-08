import { isGradientColor, parseGradient, serializeGradient } from './colorUtils';

const assert = {
    strictEqual: (a: any, b: any) => {
        if (a !== b) {
            throw new Error(`Assertion failed: ${a} !== ${b}`);
        }
    }
};

console.log('🧪 Testing color utilities...');

// 1. isGradientColor 测试
assert.strictEqual(isGradientColor('#FFFFFF'), false);
assert.strictEqual(isGradientColor('rgb(255, 255, 255)'), false);
assert.strictEqual(isGradientColor('linear-gradient(90deg, #fff 0%, #000 100%)'), true);

// 2. parseGradient 测试
const parsed = parseGradient('linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)');
assert.strictEqual(parsed.angle, 135);
assert.strictEqual(parsed.from.toUpperCase(), '#FF7E5F');
assert.strictEqual(parsed.to.toUpperCase(), '#FEB47B');

const parsedFallback = parseGradient('invalid-color');
assert.strictEqual(parsedFallback.angle, 180);
assert.strictEqual(parsedFallback.from.toUpperCase(), '#667EEA');
assert.strictEqual(parsedFallback.to.toUpperCase(), '#764BA2');

// 3. serializeGradient 测试
const serialized = serializeGradient(90, '#FF0000', '#0000FF');
assert.strictEqual(serialized, 'linear-gradient(90deg, #FF0000 0%, #0000FF 100%)');

console.log('✅ All colorUtils tests passed successfully!');
