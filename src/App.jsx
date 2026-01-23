import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Add more routes as you build out the application */}
        </Routes>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Funk Brokers</h1>
      <p>Residential Real Estate Marketplace Platform</p>
      <p>🚧 Under Construction 🚧</p>
    </div>
  );
}

export default App;
