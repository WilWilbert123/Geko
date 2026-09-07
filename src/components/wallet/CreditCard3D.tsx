import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei/native';
import * as THREE from 'three';

interface Props {
  color1: string;
  color2: string;
  bankName: string;
  balance: string;
  position?: [number, number, number];
}

export const CreditCard3D = ({ color1, color2, bankName, balance, position }: Props) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);

  // Subtle interactive tilt only, no floating
  useFrame(() => {
    if (groupRef.current) {
      const targetRotY = hovered ? 0.2 : 0;
      const targetRotX = hovered ? -0.1 : 0;

      // Lerp for smoothness
      groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.1;
      groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.1;
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={position}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      {/* Main Card Body */}
      <RoundedBox args={[3.4, 2.1, 0.05]} radius={0.15} smoothness={4}>
        <meshPhysicalMaterial 
          color={color1} 
          metalness={0.4}
          roughness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>

      {/* Accent Strip */}
      <RoundedBox args={[3.41, 0.8, 0.06]} position={[0, -0.65, 0]} radius={0.1} smoothness={4}>
        <meshPhysicalMaterial 
          color={color2} 
          metalness={0.8}
          roughness={0.4}
          transparent={true}
          opacity={0.9}
        />
      </RoundedBox>

      {/* Chip */}
      <RoundedBox args={[0.4, 0.3, 0.06]} position={[-1.2, 0.5, 0.01]} radius={0.05}>
        <meshStandardMaterial color="#FFD700" metalness={1} roughness={0.3} />
      </RoundedBox>

    </group>
  );
};
