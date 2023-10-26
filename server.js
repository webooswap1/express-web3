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

    // Inisialisasi web3
    const web3 = new Web3(new Web3.providers.HttpProvider(rpc_url));

    // Inisialisasi kontrak
    const contract = new web3.eth.Contract(abi, contract_address);

    try {
        const result = await contract.methods[function_name](...function_args).call();
        return res.status(200).send({ result });
    } catch (error) {
        return res.status(500).send({ error: 'Failed to call contract function' });
    }
})

app.post('/check-gas', async(req, res) => {
    const body = req.body;
    if(!body.rpcUrl || !body.address || !body.stakeAddress || !body.adminKey) {
        res.status(400).send('Missing parameters.');
        return;
    }

    try {
        let web3 = new Web3(body.rpcUrl);
        const gasPrice = await web3.eth.getGasPrice();
        const stakeAbi = require('./abi/stake.json')
        const stakeContract = await new web3.eth.Contract(
            stakeAbi,
            body.stakeAddress
        );

        const privateKey = Buffer.from(body.adminKey, 'hex'); // remove the '0x' prefix if present
        const publicKey = ethUtil.privateToPublic(privateKey);
        const ownerAddress = '0x'+ethUtil.publicToAddress(publicKey).toString('hex');

        const estimatedGas = await stakeContract.methods.claimReward(
            web3.utils.toHex(body.address),
        ).estimateGas({from: ownerAddress});
        const gasAmountInWei = new BigNumber(gasPrice).multipliedBy(new BigNumber(Math.round(estimatedGas)));
        return res.json({
            'gasPrice': gasPrice,
            'ownerAddress': ownerAddress,
            'estimatedGasInWei': gasAmountInWei.toString(),
            'estimatedGasInEth': web3.utils.fromWei(gasAmountInWei.toString(), 'ether')
        })
    } catch (err) {
        console.error("Error fetching winners:", err);
        res.status(500).send(err);
    }
})

app.post('/claim-reward', async(req, res) => {
    const body = req.body;
    if(!body.rpcUrl || !body.address || !body.stakeAddress || !body.adminKey) {
        res.status(400).send('Missing parameters.');
        return;
    }

    try {
        let web3 = new Web3(body.rpcUrl);
        const gasPrice = await web3.eth.getGasPrice();
        const stakeAbi = require('./abi/stake.json')
        const stakeContract = await new web3.eth.Contract(
            stakeAbi,
            body.stakeAddress
        );

        const privateKey = Buffer.from(body.adminKey, 'hex'); // remove the '0x' prefix if present
        const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey.toString('hex')); // Convert private key to account

        const estimatedGas = await stakeContract.methods.claimReward(
            web3.utils.toHex(body.address),
        ).estimateGas({from: account.address});
        const gasAmountInWei = new BigNumber(gasPrice).multipliedBy(new BigNumber(Math.round(estimatedGas * 1.5)));

        const tx = {
            from: account.address,
            to: body.stakeAddress,
            gas: estimatedGas,
            gasPrice: gasPrice,
            data: stakeContract.methods.claimReward(web3.utils.toHex(body.address)).encodeABI()
        };

        account.signTransaction(tx)
            .then(signedTx => web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction))
            .then(receipt => {
                // Handle the transaction receipt here
                res.json({
                    'transactionHash': receipt.transactionHash,
                    'gasPrice': gasPrice,
                    'ownerAddress': account.address,
                    'estimatedGasInWei': gasAmountInWei.toString(),
                    'estimatedGasInEth': web3.utils.fromWei(gasAmountInWei.toString(), 'ether')
                });
            })
            .catch(txError => {
                console.error("Error sending transaction:", txError);
                res.status(500).send(txError.message);
            });
    } catch (err) {
        console.error("Error fetching winners:", err);
        res.status(500).send(err);
    }
})


app.listen(PORT, (req, res) => {
    console.log(`Node.js app listening at http://localhost:${PORT}`);
});
