const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const {interface, bytecode} = require('../compile');
const provider = ganache.provider();
const web3 = new Web3(provider);

let lottery;
let accounts;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({data: bytecode})
    .send({from: accounts[0], gas: '1000000'});
  lottery.setProvider(provider);
});

describe('Lottery Contract', () => {
  it('deploys a contract', () => {

    assert.ok(lottery.options.address);
  });

  it('allows multiple users to enter', async () => {
    await lottery.methods.enter().send({from: accounts[0], value: web3.utils.toWei('0.02', 'ether')});
    await lottery.methods.enter().send({from: accounts[1], value: web3.utils.toWei('0.02', 'ether')});
    const players = await lottery.methods.listPlayers().call({
      from: accounts[0]
    });

    assert.equal(accounts[0], players[0]);
    assert.equal(accounts[1], players[1]);
    assert.equal(2, players.length)
  });

  it('enforces a minimum contribution', async () => {
    try {
      await lottery.methods.enter().send({from: accounts[0], value: web3.utils.toWei('0.00', 'ether')});
      assert(false);
    } catch (err) {

      assert(err);
    }
  });


  it('only allows the manager to call pick winner', async () => {
    try {
      await lottery.methods.pickWinner().send({from: accounts[1]});
      assert(false);
    } catch (err) {

      assert(err);
    }
  });

  it('picks a winner and distributes the money', async () => {
    await lottery.methods.enter().send({from: accounts[1], value: web3.utils.toWei('2', 'ether')});
    const initialBalance = await web3.eth.getBalance(accounts[1]);
    await lottery.methods.pickWinner().send({from: accounts[0]});
    const endBalance = await web3.eth.getBalance(accounts[1]);
    const difference = endBalance - initialBalance;
    const finalLotteryBalance = await web3.eth.getBalance(lottery.options.address);

    assert.equal(difference, web3.utils.toWei('2', 'ether'));
    assert.equal(finalLotteryBalance, 0);
    const winner = await lottery.methods.winner().call();
    assert.equal(winner, accounts[1]);
  });
});