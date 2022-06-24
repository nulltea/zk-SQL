import {setLoggedInState, loggedInState} from '../../store/auth';
import {ethers} from "ethers";
import {useSnapshot} from "valtio";

export const useLogin = () => {
  const {isLoggedIn, address} = useSnapshot(loggedInState);

  const login = async () => {
    console.log("login");
    if(!window.ethereum) {
      alert("please install MetaMask")
      return
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum)
    provider.send("eth_requestAccounts", [])
      .then((accounts)=>{
        if(accounts.length>0) setLoggedInState({
          isLoggedIn: true,
          address: accounts[0],
          addressIndex: 0,
        })
      })
      .catch((e)=>console.log(e));
  };

  return {
    login,
    isLoggedIn,
    address,
  };
};

export default useLogin;
