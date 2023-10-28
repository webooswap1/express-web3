const Web3 = require('web3');

const express = require('express');
const ethUtil = require('ethereumjs-util');
const BigNumber = require('bignumber.js');
const stakeAbi = require("./abi/stake.json");
const app = express();
const PORT = 3001;
app.use(express.json());

app.get('/ping', (req, res) => {
    res.json({
        'message': 'pong',
    });
});

app.post('/callfunction', async(req, res) => {
    const { contract_address, abi, rpc_url, function_name, function_args } = req.body;

    if (!contract_address || !abi || !rpc_url || !function_name) {
        return res.status(400).send({ error: 'All required parameters are not provided' });
    }
    const web3 = new Web3(new Web3.providers.HttpProvider(rpc_url));

    const abiJson = typeof abi === 'string' ? JSON.parse(abi) : abi;
    const contract = new web3.eth.Contract(abiJson, contract_address);

    try {
        const result = await contract.methods[function_name](...function_args).call();
        return res.status(200).send({ result });
    } catch (error) {
        return res.status(500).send({ error: 'Failed to call contract function', reason: error });
    }
})

app.listen(PORT, (req, res) => {
    console.log(`Node.js app listening at http://localhost:${PORT}`);
});
