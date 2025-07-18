import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders EKS Application header', () => {
  render(<App />);
  const headerElement = screen.getByText(/EKS Application/i);
  expect(headerElement).toBeInTheDocument();
});

test('renders DevOps Bootcamp subtitle', () => {
  render(<App />);
  const subtitleElement = screen.getByText(/DevOps Bootcamp - Project 3/i);
  expect(subtitleElement).toBeInTheDocument();
});

test('renders footer text', () => {
  render(<App />);
  const footerElement = screen.getByText(/Deployed on Amazon EKS with Terraform/i);
  expect(footerElement).toBeInTheDocument();
});