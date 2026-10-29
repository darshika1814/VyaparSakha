process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.CLOUDINARY_NAME = 'demo';
process.env.TWILIO_ACCOUNTSID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
process.env.TWILIO_AUTHTOKEN = 'token';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod, app;
let A, B; // { token, id }

const auth = (who) => ({ Authorization: `Bearer ${who.token}` });

async function register(email) {
    const res = await request(app).post('/auth/register').send({
        name: 'Owner', shopName: `Shop ${email}`, email, password: 'password123'
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return { token: res.body.token, id: res.body.shopkeeper.id };
}

before(async () => {
    // Set TEST_MONGO_URI to use an existing MongoDB-compatible server;
    // otherwise an in-memory MongoDB is downloaded and started.
    if (process.env.TEST_MONGO_URI) {
        await mongoose.connect(process.env.TEST_MONGO_URI, {
            dbName: `vyaparsakha_test_${Date.now()}`
        });
    } else {
        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
    }
    app = require('../app');
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    A = await register('a@shop.com');
    B = await register('b@shop.com');
});

after(async () => {
    if (process.env.TEST_MONGO_URI) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

test('registration validates input and rejects duplicates', async () => {
    let res = await request(app).post('/auth/register').send({ email: 'x', password: '1' });
    assert.equal(res.status, 400);
    res = await request(app).post('/auth/register').send({
        name: 'O', shopName: 'S', email: 'A@shop.com', password: 'password123'
    });
    assert.equal(res.status, 409);
});

test('login works, wrong password and unknown email are rejected alike', async () => {
    let res = await request(app).post('/auth/login').send({ email: 'a@shop.com', password: 'password123' });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.shopkeeper.password, undefined);

    const bad = await request(app).post('/auth/login').send({ email: 'a@shop.com', password: 'nope' });
    const none = await request(app).post('/auth/login').send({ email: 'z@shop.com', password: 'nope' });
    assert.equal(bad.status, 401);
    assert.equal(none.status, 401);
    assert.equal(bad.body.message, none.body.message);
});

test('protected routes reject missing, malformed, forged and wrong-type tokens', async () => {
    for (const path of ['/user', '/city', '/bill/getproduct', '/trans', '/trans/getbyUser']) {
        assert.equal((await request(app).get(path)).status, 401, path);
    }
    assert.equal((await request(app).post('/sms/send-sms').send({})).status, 401);
    assert.equal((await request(app).delete('/uploads/deleteimage').send({})).status, 401);

    const garbage = await request(app).get('/city').set('Authorization', 'Bearer abc');
    assert.equal(garbage.status, 401);

    const forged = jwt.sign({ type: 'shopkeeper' }, 'wrong-secret', { subject: A.id });
    assert.equal((await request(app).get('/city').set('Authorization', `Bearer ${forged}`)).status, 401);

    // Old customer-style token ({ user: { id } }) must not work.
    const legacy = jwt.sign({ user: { id: A.id } }, process.env.JWT_SECRET);
    assert.equal((await request(app).get('/city').set('Authorization', `Bearer ${legacy}`)).status, 401);

    // Valid signature but the account does not exist.
    const ghost = jwt.sign({ type: 'shopkeeper' }, process.env.JWT_SECRET, {
        subject: new mongoose.Types.ObjectId().toString()
    });
    assert.equal((await request(app).get('/city').set('Authorization', `Bearer ${ghost}`)).status, 401);

    const expired = jwt.sign({ type: 'shopkeeper' }, process.env.JWT_SECRET, { subject: A.id, expiresIn: -10 });
    assert.equal((await request(app).get('/city').set('Authorization', `Bearer ${expired}`)).status, 401);

    assert.equal((await request(app).get('/auth/me').set(auth(A))).status, 200);
});

test('each shopkeeper only sees and changes their own data', async () => {
    // A builds data.
    assert.equal((await request(app).post('/city/addcity').set(auth(A)).send({ name: 'Jaipur' })).status, 201);
    const cityA = (await request(app).get('/city').set(auth(A))).body[0];
    let res = await request(app).post('/user/createUser').set(auth(A))
        .send({ name: 'Ramesh', mobileno: 9876543210, address: 'Jaipur' });
    assert.equal(res.status, 201);
    const custA = res.body;
    res = await request(app).post('/trans/createTransaction').set(auth(A))
        .send({ customerId: custA._id, amount: 500, description: 'Sale', type: 'credit' });
    assert.equal(res.status, 201);
    const txA = res.body.transaction;
    res = await request(app).post('/bill/addproduct').set(auth(A)).send({ name: 'Rice', price: 50, quantity: 2 });
    assert.equal(res.status, 201);
    const prodA = res.body;

    // B sees nothing of A's.
    assert.deepEqual((await request(app).get('/city').set(auth(B))).body, []);
    assert.deepEqual((await request(app).get('/user').set(auth(B))).body, []);
    assert.deepEqual((await request(app).get('/bill/getproduct').set(auth(B))).body, []);
    assert.deepEqual((await request(app).get('/trans').set(auth(B))).body, []);
    assert.deepEqual((await request(app).get('/user/getbycity?address=Jaipur').set(auth(B))).body, []);
    assert.deepEqual((await request(app).get('/user/searchuser?name=Ramesh').set(auth(B))).body, []);

    // B cannot read A's records by id.
    assert.equal((await request(app).get(`/trans/gettrans/${txA._id}`).set(auth(B))).status, 404);
    assert.equal((await request(app).get(`/trans/getbyUser?customerId=${custA._id}`).set(auth(B))).status, 404);
    assert.equal((await request(app).get(`/trans?customerId=${custA._id}`).set(auth(B))).body.length, 0);

    // B cannot write against A's records.
    res = await request(app).post('/trans/createTransaction').set(auth(B))
        .send({ customerId: custA._id, amount: 10, description: 'x', type: 'credit' });
    assert.equal(res.status, 404);
    assert.equal((await request(app).put(`/trans/updatetransaction/${txA._id}`).set(auth(B)).send({ amount: 1 })).status, 404);
    assert.equal((await request(app).delete(`/trans/deletetrans/${txA._id}`).set(auth(B))).status, 404);
    assert.equal((await request(app).delete(`/user/deleteUser/${custA._id}`).set(auth(B))).status, 404);
    assert.equal((await request(app).delete(`/city/deletecity/${cityA._id}`).set(auth(B))).status, 404);
    assert.equal((await request(app).put(`/bill/updateproduct/${prodA._id}`).set(auth(B)).send({ name: 'h', price: 1, quantity: 1 })).status, 404);
    assert.equal((await request(app).delete(`/bill/deleteproduct/${prodA._id}`).set(auth(B))).status, 404);
    assert.equal((await request(app).post('/sms/send-sms').set(auth(B)).send({ customerId: custA._id })).status, 404);

    // B's deleteAll and an A-city user injection don't touch A.
    await request(app).delete('/bill/deleteAll').set(auth(B));
    res = await request(app).post('/user/createUser').set(auth(B))
        .send({ name: 'Sneaky', mobileno: 9111111111, address: 'Jaipur' });
    assert.equal(res.status, 400);

    // Operator-injection attempts return nothing instead of everything.
    assert.deepEqual((await request(app).get('/user/searchuser?name[$ne]=zzz').set(auth(B))).body, []);

    // A's data is intact.
    assert.equal((await request(app).get('/bill/getproduct').set(auth(A))).body.length, 1);
    const summary = (await request(app).get(`/trans/getbyUser?customerId=${custA._id}`).set(auth(A))).body;
    assert.equal(summary.balance, 500);
    assert.equal(summary.transactions.length, 1);
    assert.equal((await request(app).get(`/trans/gettrans/${txA._id}`).set(auth(A))).status, 200);
});

test('same mobile number and city name may exist under different shopkeepers', async () => {
    assert.equal((await request(app).post('/city/addcity').set(auth(B)).send({ name: 'Jaipur' })).status, 201);
    const res = await request(app).post('/user/createUser').set(auth(B))
        .send({ name: 'Ramesh B', mobileno: 9876543210, address: 'Jaipur' });
    assert.equal(res.status, 201);

    // But not twice under the same shopkeeper.
    assert.equal((await request(app).post('/city/addcity').set(auth(B)).send({ name: 'Jaipur' })).status, 409);
    const dup = await request(app).post('/user/createUser').set(auth(B))
        .send({ name: 'Again', mobileno: 9876543210, address: 'Jaipur' });
    assert.equal(dup.status, 409);
});

test('balance rules and image ownership are enforced', async () => {
    const cust = (await request(app).get('/user').set(auth(A))).body[0];

    let res = await request(app).post('/trans/createTransaction').set(auth(A))
        .send({ customerId: cust._id, amount: 9999, description: 'too much', type: 'debit' });
    assert.equal(res.status, 400);

    // Image from someone else's folder is rejected.
    res = await request(app).post('/trans/createTransaction').set(auth(A)).send({
        customerId: cust._id, amount: 10, description: 'img', type: 'credit',
        img: [`https://res.cloudinary.com/demo/image/upload/v1/Bills/${B.id}/x.jpg`]
    });
    assert.equal(res.status, 400);
    res = await request(app).post('/trans/createTransaction').set(auth(A)).send({
        customerId: cust._id, amount: 10, description: 'img', type: 'credit',
        img: [`https://res.cloudinary.com/demo/image/upload/v1/Bills/${A.id}/x.jpg`]
    });
    assert.equal(res.status, 201);

    // Deleting another shopkeeper's (or legacy) image is forbidden.
    res = await request(app).delete('/uploads/deleteimage').set(auth(A)).send({
        imageUrls: [`https://res.cloudinary.com/demo/image/upload/v1/Bills/${B.id}/x.jpg`]
    });
    assert.equal(res.status, 403);
});

test('deleting a customer or city removes only own transactions', async () => {
    const custA = (await request(app).get('/user').set(auth(A))).body[0];
    const custB = (await request(app).get('/user').set(auth(B))).body[0];
    await request(app).post('/trans/createTransaction').set(auth(B))
        .send({ customerId: custB._id, amount: 70, description: 'b sale', type: 'credit' });

    assert.equal((await request(app).delete(`/user/deleteUser/${custA._id}`).set(auth(A))).status, 200);
    assert.equal((await request(app).get('/trans').set(auth(A))).body.length, 0);
    assert.equal((await request(app).get('/trans').set(auth(B))).body.length, 1);

    const cityB = (await request(app).get('/city').set(auth(B))).body[0];
    assert.equal((await request(app).delete(`/city/deletecity/${cityB._id}`).set(auth(B))).status, 200);
    assert.equal((await request(app).get('/trans').set(auth(B))).body.length, 0);
});

test('balances reset each 1 April; closed years are reported and frozen', async () => {
    const { fyStartYearOf, fyRange } = require('../utils/financialYear');
    const { Transaction } = require('../model/transaction');
    const cur = fyStartYearOf();
    const prev = fyRange(cur - 1);
    const now = fyRange(cur);

    assert.equal(now.start.toISOString().slice(11, 19), '18:30:00'); // midnight IST

    await request(app).post('/city/addcity').set(auth(A)).send({ name: 'Kota' });
    const mk = async (name, mob) => (await request(app).post('/user/createUser').set(auth(A))
        .send({ name, mobileno: mob, address: 'Kota' })).body;
    const c1 = await mk('Anil', 9000000001);
    const c2 = await mk('Bhanu', 9000000002);

    // Previous year: c1 credit 1000 / debit 300, c2 credit 50. One tx exactly on the boundary.
    const old = (c, type, amount, date) => Transaction.create({
        shopkeeper: A.id, user: c._id, type, amount, description: 'old', date
    });
    const lastDay = new Date(now.start.getTime() - 1000);       // 31 Mar 23:59:59 IST
    await old(c1, 'credit', 1000, new Date(prev.start.getTime() + 1000));
    await old(c1, 'debit', 300, lastDay);
    await old(c2, 'credit', 50, new Date(prev.start.getTime() + 86400000));
    const oldTx = await Transaction.findOne({ user: c1._id, type: 'debit' });
    // Another shopkeeper's old data must not leak into A's report.
    await Transaction.create({ shopkeeper: B.id, user: new mongoose.Types.ObjectId(), type: 'credit', amount: 777, description: 'b', date: lastDay });
    // First moment of the new year.
    await old(c1, 'credit', 40, now.start);

    // Current year starts at zero: the old 700 balance is not carried over.
    let res = await request(app).get(`/trans/getbyUser?customerId=${c1._id}`).set(auth(A));
    assert.equal(res.body.balance, 40);
    assert.equal(res.body.credit, 40);
    assert.equal(res.body.debit, 0);
    assert.equal(res.body.transactions.length, 1);
    assert.equal(res.body.readOnly, false);

    // So a debit above the NEW balance is refused even though last year ended positive.
    res = await request(app).post('/trans/createTransaction').set(auth(A))
        .send({ customerId: c1._id, amount: 100, description: 'd', type: 'debit' });
    assert.equal(res.status, 400);

    // Previous year can still be viewed (read-only).
    res = await request(app).get(`/trans/getbyUser?customerId=${c1._id}&fy=${cur - 1}`).set(auth(A));
    assert.equal(res.body.credit, 1000);
    assert.equal(res.body.debit, 300);
    assert.equal(res.body.balance, 700);
    assert.equal(res.body.readOnly, true);
    assert.equal(res.body.financialYear, `${cur - 1}-${String(cur % 100).padStart(2, '0')}`);

    // Report defaults to the previous year, totals add up, only own data.
    res = await request(app).get('/trans/report').set(auth(A));
    assert.equal(res.status, 200);
    assert.equal(res.body.fy, cur - 1);
    assert.deepEqual(res.body.totals, { credit: 1050, debit: 300, balance: 750 });
    assert.equal(res.body.customers.length, 2);
    const anil = res.body.customers.find((c) => c.name === 'Anil');
    assert.deepEqual([anil.credit, anil.debit, anil.balance], [1000, 300, 700]);
    assert.deepEqual((await request(app).get('/trans/report').set(auth(B))).body.totals, { credit: 0, debit: 0, balance: 0 });

    // Current-year report and bad years.
    assert.equal((await request(app).get(`/trans/report?fy=${cur}`).set(auth(A))).body.totals.credit, 40);
    assert.equal((await request(app).get(`/trans/report?fy=${cur + 1}`).set(auth(A))).status, 400);
    assert.equal((await request(app).get('/trans/report?fy=abc').set(auth(A))).status, 400);
    assert.equal((await request(app).get('/trans/report')).status, 401);

    // Closed-year transactions cannot be edited or deleted; dates can't move into them.
    assert.equal((await request(app).put(`/trans/updatetransaction/${oldTx._id}`).set(auth(A)).send({ amount: 1 })).status, 403);
    assert.equal((await request(app).delete(`/trans/deletetrans/${oldTx._id}`).set(auth(A))).status, 403);
    const curTx = (await request(app).get(`/trans/getbyUser?customerId=${c1._id}`).set(auth(A))).body.transactions[0];
    assert.equal((await request(app).put(`/trans/updatetransaction/${curTx._id}`).set(auth(A))
        .send({ date: new Date(prev.start.getTime() + 5000).toISOString() })).status, 400);
    assert.equal((await request(app).put(`/trans/updatetransaction/${curTx._id}`).set(auth(A)).send({ amount: 45 })).status, 200);
});
