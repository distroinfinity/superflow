import logo from './logo.svg';
import './App.css';
import TokenDeployer from './components/deploytoken';
import CreateUniswapPool from './components/deploypools';


function App() {
  return (
    <div className="App">
      <TokenDeployer/>
       <CreateUniswapPool/>
       
    </div>
  );
}

export default App;
