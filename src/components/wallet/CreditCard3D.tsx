import React from 'react';
import { GekoCard3D } from './GekoCard3D';

interface Props {
  color1?: string;
  color2?: string;
  bankName?: string;
  balance?: string | number;
  position?: [number, number, number];
  cardNumber?: string;
  cardholderName?: string;
}

export const CreditCard3D = ({
  balance = 9350,
  bankName = 'GEKO PLATINUM',
  cardNumber = '4289 •••• •••• 9012',
  cardholderName = 'GEKO MEMBER',
}: Props) => {
  const numericBalance = typeof balance === 'string' ? parseFloat(balance.replace(/[^0-9.-]+/g, '')) || 9350 : balance;

  return (
    <GekoCard3D
      balance={numericBalance}
      cardholderName={cardholderName}
      accountType={bankName}
      cardNumber={cardNumber}
      height={220}
    />
  );
};

export { GekoCard3D };
