/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/app/AppProviders', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    AppProviders: () => ReactLib.createElement(View),
  };
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
