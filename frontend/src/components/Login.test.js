import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

const MockedLogin = ({ onLogin }) => (
  <BrowserRouter>
    <Login onLogin={onLogin} />
  </BrowserRouter>
);

test('renders login form', () => {
  render(<MockedLogin onLogin={() => {}} />);
  expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
});