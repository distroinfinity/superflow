import logo from './logo.svg';
import './App.css';
import TokenDeployer from './components/deploytoken';
import { SetupUniswapForm } from './components/deploypools';
function App() {
  return (
    <div className="App">
      <TokenDeployer/>
     <SetupUniswapForm/>

       
    </div>
  );
}

export default App;
