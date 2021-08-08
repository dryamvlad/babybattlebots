import { createStore } from 'vuex'
import Web3 from "web3";
import { ABI } from '../contracts_config.js'
import { createToast } from 'mosha-vue-toastify';

export default createStore({
    state: {
        web3: null,
        web3Connected: false,
        wallet: 0,
        bbbContract: null,
        contractData: {},
        transactionPending: false,
        price: 0.03
    },
    mutations: {
        setWallet(state, newWallet) {
            state.wallet = newWallet;
        },
        setWeb3(state, newWeb3) {
            state.web3 = newWeb3;
        },
        setBbbContract(state, newBbbContract) {
            state.bbbContract = newBbbContract;
        },
        setContractData(state, newContractData) {
            state.contractData = newContractData;
        },
        setWeb3Connected(state, newWeb3Connected) {
            state.web3Connected = newWeb3Connected;
        },
        setTransactionPending(state, newTransactionPending) {
            state.transactionPending = newTransactionPending;
        }
    },
    actions: {
        async initWeb3({ commit }, vm) {
            const web3 = new Web3(window.ethereum);
            const accounts = await web3.eth.getAccounts();
            const netId = await web3.eth.net.getId();
            var wallet = accounts[0];

            if (netId !== 1) {
                createToast("Wrong network", {
                    position: 'top-center',
                    type: 'danger',
                    transition: 'slide',
                    timeout: 20000,
                    showIcon: 'true',
                    hideProgressBar: 'true'
                })
                return;
            }

            if (accounts.length == 0) {
                return;
            }

            var bbbContract = new web3.eth.Contract(ABI, "0xbeA022640D6Ce7FF51ec9039f6DD9cdE89EA83e4");
            var web3Connected = true;

            commit('setWeb3', web3)
            commit('setWeb3Connected', web3Connected)
            commit('setWallet', wallet)
            commit('setBbbContract', bbbContract)

            this.dispatch('getContractData');
        },
        async getContractData() {
            const contractData = {
                totalSupply: await this.state.bbbContract.methods.totalSupply().call(),
                owned: await this.state.bbbContract.methods.balanceOf(this.state.wallet).call(),
                price: await this.state.bbbContract.methods.getPrice().call(),
                paused: await this.state.bbbContract.methods._paused().call()
            };
            this.commit('setContractData', contractData)
        },
        async mintBot({ commit }, number) {
            if (this.state.bbbContract) {
                const price = Number(this.state.contractData.price) * number;
                const store = this;
                this.state.bbbContract.methods.mintBot(number).estimateGas({ from: this.state.wallet, value: price }).then(function (gasAmount) {
                    store.commit('setTransactionPending', true)

                    store.state.bbbContract.methods
                        .mintBot(number)
                        .send({ from: store.state.wallet, value: price, gas: String(gasAmount) })
                        .on('transactionHash', function (hash) {
                            console.log("transactionHash: ", hash)
                        })
                        .on('receipt', function (receipt) {
                            if (receipt.status) {
                                createToast("You got it! Congrats!", {
                                    position: 'top-center',
                                    type: 'success',
                                    transition: 'slide',
                                    timeout: 20000,
                                    showIcon: 'true',
                                    hideProgressBar: 'true'
                                })
                            } else {
                                createToast("Transaction failed :(", {
                                    position: 'top-center',
                                    type: 'danger',
                                    transition: 'slide',
                                    timeout: 20000,
                                    showIcon: 'true',
                                    hideProgressBar: 'true'
                                })
                            }

                            store.dispatch('getContractData');
                            store.commit('setTransactionPending', false)
                        })
                        .on('error', function (error) {
                            store.commit('setTransactionPending', false)
                        })
                }).catch(function(error) {
                    createToast("Looks like you don't have enough funds, sorry :(", {
                        position: 'top-center',
                        type: 'danger',
                        transition: 'slide',
                        timeout: 20000,
                        showIcon: 'true',
                        hideProgressBar: 'true'
                    })
                    store.commit('setTransactionPending', false)
                })
            }
        }
    },
    getters: {
        ethPrice(state) {
            if (state.web3 && state.contractData.price > 0)
                return state.web3.utils.fromWei(state.contractData.price)
        },
        shortWallet(state) {
            var str = new String(state.wallet)
            return str.substring(0, 4) + '...' + str.substring(str.length - 4)
        }
    },
    modules: {

    }
})