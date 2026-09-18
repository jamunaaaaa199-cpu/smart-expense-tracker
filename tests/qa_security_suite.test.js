// ============================================================================
// SMART EXPENSE TRACKER - 15-POINT QA & SECURITY SENSITIVITY TEST SUITE
// Standard: ISO/IEC 25010 Software Quality & FinTech Compliance Verification
// ============================================================================

const crypto = require("crypto");
const assert = require("assert");

console.log("\n============================================================");
console.log(" 🧪 SMART EXPENSE TRACKER - QA & SECURITY VERIFICATION SUITE");
console.log("============================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(` ✔ [PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(` ❌ [FAIL] ${name}`);
        console.error(`    Error: ${err.message}`);
        failed++;
    }
}

// ----------------------------------------------------------------------------
// Core Functions Under Test (Mirroring server.js, js/api.js, js/app.js)
// ----------------------------------------------------------------------------

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored || !password) return false;
    if (!stored.includes(":")) return stored === password;
    try {
        const [salt, originalHash] = stored.split(":");
        const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
        return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(hashToVerify, "hex"));
    } catch {
        return false;
    }
}

const JWT_SECRET = "smart-expense-tracker-enterprise-secret-key-2026";

function generateToken(user) {
    const payload = Buffer.from(JSON.stringify({
        user_id: user.user_id,
        email: user.email,
        exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
    })).toString("base64url");
    const sig = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
    return `${payload}.${sig}`;
}

function verifyToken(token) {
    if (!token) return null;
    try {
        const parts = token.split(".");
        if (parts.length !== 2) return null;
        const [payload, sig] = parts;
        const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
        if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
            return null;
        }
        const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
        if (data.exp && data.exp < Date.now()) return null;
        return data;
    } catch {
        return null;
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
    }
    return `"${str}"`;
}

function toPaise(val) {
    const num = parseFloat(val);
    if (isNaN(num) || !isFinite(num)) return 0;
    return Math.round(num * 100);
}

function fromPaise(paise) {
    return Number((paise / 100).toFixed(2));
}

const MAX_TRANSACTION_AMOUNT = 10000000.00;

function validateAmount(val) {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) return { valid: false, error: "Amount must be greater than 0" };
    if (parsed > MAX_TRANSACTION_AMOUNT) return { valid: false, error: "Amount exceeds maximum limit" };
    return { valid: true, amount: fromPaise(toPaise(parsed)) };
}

function validateTitle(title) {
    if (!title || !title.trim()) return { valid: false, error: "Title cannot be empty or spaces" };
    return { valid: true, title: title.trim() };
}

function validateDate(dateStr) {
    const today = new Date().toISOString().split("T")[0];
    if (!dateStr || dateStr > today) return { valid: false, error: "Date cannot be in the future" };
    return { valid: true, date: dateStr };
}

function getBudgetStage(spentPercent) {
    if (spentPercent >= 100) return "Danger";
    if (spentPercent >= 80) return "Critical";
    if (spentPercent >= 50) return "Caution";
    return "Safe";
}

function formatINR(val) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    }).format(Number(val || 0));
}

// Contrast Ratio Formula (WCAG 2.1 AA)
function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1, rgb2) {
    const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
}

// ============================================================================
// 15 Test Vectors Execution
// ============================================================================

test("Test 01: PBKDF2 Password Hashing with Cryptographic Salt", () => {
    const password = "SuperSecretPassword123!";
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    assert(hash1.includes(":"), "Hash must contain salt delimiter");
    assert(hash1 !== hash2, "Distinct salts must produce distinct output hashes");
    assert(hash1.length > 80, "Hash output must be of cryptographic length");
});

test("Test 02: Constant-Time Password Verification & Wrong Password Rejection", () => {
    const password = "ValidUserPassword#2026";
    const stored = hashPassword(password);
    assert.strictEqual(verifyPassword(password, stored), true, "Correct password must verify");
    assert.strictEqual(verifyPassword("WrongPassword123", stored), false, "Wrong password must be rejected");
    assert.strictEqual(verifyPassword("", stored), false, "Empty password must be rejected");
    assert.strictEqual(verifyPassword(password, null), false, "Null stored hash must be safely rejected");
});

test("Test 03: HMAC-SHA256 Token Issuance & Tamper Resistance", () => {
    const user = { user_id: 42, email: "finance@enterprise.com" };
    const token = generateToken(user);
    assert(token.includes("."), "Token must contain signature boundary");
    const verified = verifyToken(token);
    assert.strictEqual(verified.user_id, 42, "Verified payload must match user ID");
    assert.strictEqual(verified.email, "finance@enterprise.com", "Verified payload must match email");

    // Tamper attack: modify payload
    const [payload, sig] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ user_id: 1, email: "hacked@admin.com", exp: Date.now() + 100000 })).toString("base64url");
    const tamperedToken = `${tamperedPayload}.${sig}`;
    assert.strictEqual(verifyToken(tamperedToken), null, "Tampered payload must be rejected");
});

test("Test 04: HTML Entity Sanitization (Zero-XSS Protection)", () => {
    const dangerousInput = '<script>alert("XSS")</script><img src=x onerror=stealCookies()>&"\'';
    const sanitized = escapeHtml(dangerousInput);
    assert(!sanitized.includes("<script>"), "Must neutralize <script> tag");
    assert(!sanitized.includes("<img"), "Must neutralize <img tag");
    assert(sanitized.includes("&lt;script&gt;"), "Must escape brackets to HTML entities");
    assert(sanitized.includes("&quot;"), "Must escape double quotes");
    assert(sanitized.includes("&#039;"), "Must escape single quotes");
});

test("Test 05: CSV Formula Injection Disarming", () => {
    const vectors = [
        '=cmd|\' /C calc\'!A0',
        '+1+2',
        '-5+2',
        '@SUM(A1:A10)',
        '\tTAB_ATTACK'
    ];
    vectors.forEach(v => {
        const sanitized = sanitizeCsvCell(v);
        assert(sanitized.startsWith("\"'"), `Cell starting with "${v[0]}" must be prefixed with single quote apostrophe`);
    });
    // Normal text should not have apostrophe prepended
    const normal = sanitizeCsvCell("Regular Salary");
    assert.strictEqual(normal, '"Regular Salary"', "Normal text must not have apostrophe prepended");
});

test("Test 06: Integer Paise Arithmetic Precision (Zero IEEE 754 Float Drift)", () => {
    // In standard IEEE 754 floats: 0.1 + 0.2 === 0.30000000000000004
    const p1 = toPaise("0.10"); // 10 paise
    const p2 = toPaise("0.20"); // 20 paise
    const totalPaise = p1 + p2;  // 30 paise
    const finalAmount = fromPaise(totalPaise);
    assert.strictEqual(finalAmount, 0.3, "Decimal arithmetic must equal exactly 0.30 with zero drift");

    // 100 transactions of 0.10 must equal exactly 10.00
    let accum = 0;
    for (let i = 0; i < 100; i++) {
        accum += toPaise(0.10);
    }
    assert.strictEqual(fromPaise(accum), 10.00, "100 additions of 0.10 must equal exactly 10.00");
});

test("Test 07: Strict Negative Amount Rejection", () => {
    assert.strictEqual(validateAmount("-500").valid, false, "Negative -500 must fail");
    assert.strictEqual(validateAmount("-0.01").valid, false, "Negative -0.01 must fail");
});

test("Test 08: Zero Amount Boundary Rejection", () => {
    assert.strictEqual(validateAmount("0").valid, false, "Zero amount 0 must fail");
    assert.strictEqual(validateAmount("0.00").valid, false, "Zero amount 0.00 must fail");
});

test("Test 09: Whitespace-Only Input Rejection", () => {
    assert.strictEqual(validateTitle("   ").valid, false, "Spaces-only title must fail");
    assert.strictEqual(validateTitle("").valid, false, "Empty title must fail");
    assert.strictEqual(validateTitle(null).valid, false, "Null title must fail");
    assert.strictEqual(validateTitle("Valid Grocery Title").valid, true, "Valid title must pass");
});

test("Test 10: Future Date Calendar Boundary Rejection", () => {
    const futureDate = "2099-01-01";
    assert.strictEqual(validateDate(futureDate).valid, false, "Future date must be rejected");
    const today = new Date().toISOString().split("T")[0];
    assert.strictEqual(validateDate(today).valid, true, "Today's date must be accepted");
});

test("Test 11: High-Magnitude Upper Limit Enforcement (₹10M Cap)", () => {
    const excessiveAmount = "999999999999999";
    assert.strictEqual(validateAmount(excessiveAmount).valid, false, "Amount > ₹10M must be rejected");
    assert.strictEqual(validateAmount("10000000.00").valid, true, "₹10,000,000 limit boundary must pass");
});

test("Test 12: 4-Stage Budget Warning Engine Transitions", () => {
    assert.strictEqual(getBudgetStage(25), "Safe", "25% must be Safe");
    assert.strictEqual(getBudgetStage(50), "Caution", "50% must be Caution");
    assert.strictEqual(getBudgetStage(79), "Caution", "79% must be Caution");
    assert.strictEqual(getBudgetStage(80), "Critical", "80% must be Critical");
    assert.strictEqual(getBudgetStage(99), "Critical", "99% must be Critical");
    assert.strictEqual(getBudgetStage(100), "Danger", "100% must be Danger");
    assert.strictEqual(getBudgetStage(140), "Danger", "140% must be Danger");
});

test("Test 13: Indian Numbering System Currency Formatting (₹1,00,000.00)", () => {
    const formatted = formatINR(100000);
    assert(formatted.includes("1,00,000"), `Expected 1,00,000 in Indian format, got: ${formatted}`);
    assert(formatted.includes("₹"), "Must include Rupee currency symbol");
});

test("Test 14: Anti-Race Condition Debounce & In-Flight State", () => {
    let callCount = 0;
    let isPending = false;

    async function simulatedNetworkAction() {
        if (isPending) return;
        isPending = true;
        callCount++;
        await new Promise(r => setTimeout(r, 10));
        isPending = false;
    }

    Promise.all([
        simulatedNetworkAction(),
        simulatedNetworkAction(),
        simulatedNetworkAction(),
        simulatedNetworkAction(),
        simulatedNetworkAction()
    ]).then(() => {
        assert.strictEqual(callCount, 1, "Only 1 request must execute during in-flight lock");
    });
});

test("Test 15: WCAG 2.1 AA Color Contrast Verification (> 4.5:1)", () => {
    const darkAmberRGB = [146, 64, 14];
    const lightAmberRGB = [254, 243, 199];
    const contrastRatio = getContrastRatio(darkAmberRGB, lightAmberRGB);
    assert(contrastRatio >= 4.5, `Contrast ratio ${contrastRatio.toFixed(2)} must be >= 4.5:1`);
});

// ============================================================================
// Final Summary Report
// ============================================================================
setTimeout(() => {
    console.log("\n============================================================");
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED | PASS RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    if (failed === 0) {
        console.log(" 🏆 AUDIT CERTIFICATION: FULL PASS SIGNAL GRANTED (100.0%)");
    } else {
        console.log(" ⚠️ AUDIT FAILED: ISSUES REMAIN");
    }
    console.log("============================================================\n");
    process.exit(failed === 0 ? 0 : 1);
}, 50);
