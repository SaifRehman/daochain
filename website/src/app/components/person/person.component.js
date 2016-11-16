import template from './person.html';
import $ from 'jquery';
// import controller from './person.controller';
import './person.scss';
import Web3 from 'web3';

function Inject(...dependencies) {
    return function decorator(target, key, descriptor) {
        if (descriptor) {
            const fn = descriptor.value;
            fn.$inject = dependencies;
        } else {
            target.$inject = dependencies;
        }
    };
}
@Inject('$scope', '$state', '$http', 'appConfig', '$interval')
class PersonController {
    constructor($scope, $state, $http, appConfig, $interval) {
        "ngInject";
        this.name = 'person';
        this.scope = $scope;
        this.$state = $state;
        this.$http = $http;
        this.$interval = $interval;
        this.APIUrl = appConfig.APIUrl;
        this.LocalUrl = appConfig.LocalUrl;
        this.Web3Url = appConfig.Web3Url;
        this.userInfo = {
            username: localStorage.getItem('username'),
            avatar: localStorage.getItem('user-avatar')
        }
        this.username = localStorage.getItem('username');
        this.walletList = [];
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.Web3Url));
        this.isMining = this.web3.eth.mining;
        this.hashrate = this.web3.eth.hashrate / 1000;
        this.deleteWallet = function(content, index) {
            this.walletList.splice(index, 1);
            $.ajax({
                type: "DELETE",
                url: this.APIUrl + "/hub/v2/blockchain/addresses/" + content,
                headers: {
                    "Authorization": "ImU5NjYwMzUxLTMyY2UtNGE2OS05MGRiLTA2YzNlMGVjNzE1MSI.CwNVBg.FFx7wUGgflqynUsMktEjWcdC_cg"
                },
                success: (res) => {
                    console.log(res);
                }
            });
        }

        this.newWallet = function() {
            $('.wallet > .add-new').css('display', 'block');
        }

        this.getWalletValue = function() {
            $('.dao-input-container.icon-inside').attr('loading', 'true');
            const str = $('.wallet > .add-new input')[0].value;
            const new_account = this.web3.personal.newAccount(str);
            $('.wallet > .add-new').css('display', 'none');
            let sentData = {
                "address": new_account
            };
            $.ajax({
                type: "POST",
                url: "http://api.daocloud.co/hub/v2/blockchain/addresses",
                headers: {
                    "Authorization": localStorage.getItem('token'),
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(sentData),
                success: (res) => {
                    this.scope.$apply(() => {
                        this.walletList.push({
                            'id': res.address,
                            'is_default': false
                        });
                        this.defaultAddress = res.address;
                    });
                }
            });
        }

        this.monitBalance = () => {
            this.moniter = this.$interval(() => {
                this.defaultAddress = this.web3.eth.getBalance(this.web3.eth.coinbase);
                this.balance = this.web3.fromWei(this.defaultAddress, 'ether').toNumber();
                this.hashrate = this.web3.eth.hashrate / 1000;
            }, 4000);
        }

        this.changeMine = () => {
            console.log(this.web3);
            let requestDataStart = {
                "jsonrpc": "2.0",
                "method": "miner_start",
                "params": [1],
                "id": 74
            };
            let requestDataStop = {
                "jsonrpc": "2.0",
                "method": "miner_stop",
                "params": [],
                "id": 74
            };
            if (this.isMining) {
                this.monitBalance();
                $.ajax({
                    type: "POST",
                    url: this.Web3Url,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data: JSON.stringify(requestDataStart),
                    success: (res) => {
                        console.log(res);
                    }
                });
            } else {
                this.$interval.cancel(this.moniter);
                $.ajax({
                    type: "POST",
                    url: this.Web3Url,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data: JSON.stringify(requestDataStop),
                    success: (res) => {
                        console.log(res);
                    }
                });
            }
        }

        this.logout = () => {
            localStorage.clear();
            this.$state.go('home');
        }

        this.setDefaultTag = (address) => {
            for (let i = 0; i < this.walletList.length; i++) {
                if (this.walletList[i].id === address) {
                    this.walletList[i].is_default = true;
                    console.log(`i is ${i} and is_default = ${this.walletList[i].is_default}`);
                } else if (this.walletList[i].is_default) {
                    this.walletList[i].is_default = false;
                }
            }
        }

        this.setDefault = (address) => {
            const postData = {
                "address": address
            };

            let setDefaultWallet = this.$http({
                method: "POST",
                url: this.LocalUrl + "/default-account",
                data: JSON.stringify(postData)
            });

            setDefaultWallet.success((res, status) => {
                this.setDefaultTag(res.default_address);
            });

            const postDataWeb3 = {
                "jsonrpc": "2.0",
                "method": "miner_setEtherbase",
                "params": [
                    address
                ],
                "id": 74
            }

            let setDefaultWalletWeb3 = this.$http({
                method: "POST",
                url: this.Web3Url,
                header: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify(postDataWeb3)
            });

            setDefaultWalletWeb3.success((res, status) => {
                console.log(res);
            });
        }
    }

    $onInit() {
        (() => {
            let localList = this.web3.personal.listAccounts;
            if (localList) {
              this.defaultAddress = this.web3.eth.getBalance(this.web3.eth.coinbase);
              this.balance = this.web3.fromWei(this.defaultAddress, 'ether').toNumber();
            }
            localList.forEach(v => {
                this.walletList.push({
                    'id': v,
                    'is_default': false
                });
            });

            let getDefault = this.$http({
                method: "GET",
                url: this.LocalUrl + '/default-account'
            });

            getDefault.success((res, status) => {
                this.setDefaultTag(res.default_address);
            });

            if (this.isMining) {
                this.monitBalance();
            }
        })();
    }
}

let personComponent = {
    restrict: 'E',
    bindings: {},
    template,
    controller: PersonController
};

export default personComponent;
