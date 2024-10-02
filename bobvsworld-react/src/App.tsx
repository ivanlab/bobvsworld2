import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DataPoint {
  date: string;
  price: number;
  prob1: number;
  prob2: number;
  prob3: number;
}

// Constantes para las apuestas de los competidores
const BET1 = 60000;
const BET2 = 120000;
const BET3 = 500000;

const App: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [dailyStdDev, setDailyStdDev] = useState<number>(1000); // Estado para la desviación típica diaria

  useEffect(() => {
    const fetchData = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);

        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const response = await axios.get(`https://api.coindesk.com/v1/bpi/historical/close.json?start=${formatDate(startDate)}&end=${formatDate(endDate)}`);
        const prices = response.data.bpi;
        console.log('Raw prices:', prices); // Verificar los datos recuperados
        const formattedData = Object.keys(prices).map((date) => ({
          date,
          price: prices[date],
          prob1: calculateProbability(prices[date], BET1, (BET1 + BET2) / 2, -Infinity) * 100, // Convertir a porcentaje
          prob2: calculateProbability(prices[date], BET2, (BET2 + BET3) / 2, (BET1 + BET2) / 2) * 100, // Convertir a porcentaje
          prob3: calculateProbability(prices[date], BET3, Infinity, (BET2 + BET3) / 2) * 100, // Convertir a porcentaje
        }));
        console.log('Formatted data:', formattedData); // Verificar los datos formateados
        setData(formattedData);
      } catch (error) {
        setError(error as Error);
      }
    };

    fetchData();
  }, [dailyStdDev]); // Volver a ejecutar el efecto cuando cambie la desviación típica diaria

  const calculateProbability = (price: number, target: number, upperLimit: number, lowerLimit: number): number => {
    const daysRemaining = (new Date('2024-12-31').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    const sigmaTotal = dailyStdDev * Math.sqrt(daysRemaining); // Uso del estado para la desviación típica diaria
    const zUpper = (upperLimit - price) / sigmaTotal;
    const zLower = (lowerLimit - price) / sigmaTotal;
    const probability = (cdf(zUpper) - cdf(zLower));
    return Math.min(Math.max(probability, 0), 1); // Asegurar que la probabilidad esté entre 0 y 1
  };

  const cdf = (x: number): number => {
    return (1 + erf(x / Math.sqrt(2))) / 2;
  };

  const erf = (x: number): number => {
    // Approximation of the error function
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="container">
      <h1>Bitcoin Price Probabilities</h1>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={(tick) => `${tick}%`} /> {/* Mostrar porcentajes */}
          <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} /> {/* Redondear a dos decimales */}
          <Legend />
          <Line type="monotone" dataKey="prob1" stroke="#8884d8" name="Bob" />
          <Line type="monotone" dataKey="prob2" stroke="#82ca9d" name="Ivan" />
          <Line type="monotone" dataKey="prob3" stroke="#ffc658" name="Al-ice" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ marginTop: '20px' }}>
        <label htmlFor="stdDevSelect">Desviación Típica Diaria: </label>
        <select
          id="stdDevSelect"
          value={dailyStdDev}
          onChange={(e) => setDailyStdDev(Number(e.target.value))}
        >
          <option value={1000}>1000</option>
          <option value={2000}>2000</option>
          <option value={3000}>3000</option>
          <option value={4000}>4000</option>
          <option value={5000}>5000</option>
        </select>
      </div>
    </div>
  );
};

export default App;