"use client"

import { useRef, useMemo, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, Text } from "@react-three/drei"
import * as THREE from "three"

interface Warehouse3DProps {
  posicoes: any[]
  nivelSelecionado: number
  onPositionClick: (posicao: any) => void
}

// Componente para uma caixa de papelão
function CardboardBox({ position, status }: { position: [number, number, number]; status: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Cor baseada no status
  const color = status === "ocupada" ? "#8B4513" : status === "bloqueada" ? "#8B0000" : "#D2B48C"
  
  return (
    <group position={position}>
      {/* Caixa principal */}
      <mesh ref={meshRef} position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.3, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
      
      {/* Etiqueta FRAGILE (apenas se ocupada) */}
      {status === "ocupada" && (
        <mesh position={[0, 0.15, 0.41]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.6, 0.2]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      )}
    </group>
  )
}

// Componente para um pallet de madeira
function WoodenPallet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base do pallet */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color="#DEB887" roughness={0.8} />
      </mesh>
      
      {/* Tábuas laterais */}
      <mesh position={[-0.4, 0.05, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 1]} />
        <meshStandardMaterial color="#CD853F" roughness={0.8} />
      </mesh>
      <mesh position={[0.4, 0.05, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 1]} />
        <meshStandardMaterial color="#CD853F" roughness={0.8} />
      </mesh>
      
      {/* Tábuas frontais */}
      <mesh position={[0, 0.05, -0.4]} castShadow>
        <boxGeometry args={[1, 0.1, 0.1]} />
        <meshStandardMaterial color="#CD853F" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.05, 0.4]} castShadow>
        <boxGeometry args={[1, 0.1, 0.1]} />
        <meshStandardMaterial color="#CD853F" roughness={0.8} />
      </mesh>
    </group>
  )
}

// Componente para uma seção do rack
function RackSection({ 
  position, 
  corredor, 
  rua, 
  nivel, 
  posicao, 
  onClick 
}: { 
  position: [number, number, number]
  corredor: number
  rua: number
  nivel: number
  posicao: any
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // Cores baseadas na imagem: azul para estrutura vertical, laranja para vigas horizontais
  const hasPallet = posicao?.status === "ocupada"
  const isBlocked = posicao?.status === "bloqueada"
  
  return (
    <group position={position}>
      {/* Estrutura vertical azul */}
      <mesh position={[-0.5, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color="#1E90FF" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0.5, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color="#1E90FF" metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Vigas horizontais laranja (5 níveis) */}
      {[0, 0.4, 0.8, 1.2, 1.6].map((y, index) => (
        <mesh key={index} position={[0, y - 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 0.05, 0.1]} />
          <meshStandardMaterial color="#FF8C00" metalness={0.2} roughness={0.5} />
        </mesh>
      ))}
      
      {/* Pallet e caixas se ocupada no nível selecionado */}
      {hasPallet && posicao?.nivel === nivel && (
        <group>
          <WoodenPallet position={[0, (nivel - 1) * 0.4 - 0.8 + 0.05, 0]} />
          {/* Empilhar 2-3 caixas */}
          {[0, 0.3, 0.6].map((y, i) => (
            <CardboardBox 
              key={i} 
              position={[0, (nivel - 1) * 0.4 - 0.8 + 0.15 + y, 0]} 
              status="ocupada"
            />
          ))}
        </group>
      )}
      
      {/* Indicador visual para posição disponível/bloqueada no nível selecionado */}
      {posicao?.nivel === nivel && !hasPallet && (
        <mesh 
          ref={meshRef}
          position={[0, (nivel - 1) * 0.4 - 0.8, 0]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[0.9, 0.05, 0.9]} />
          <meshStandardMaterial 
            color={isBlocked ? "#8B0000" : "#D3D3D3"} 
            opacity={hovered ? 0.8 : 0.3}
            transparent
          />
        </mesh>
      )}
      
      {/* Se não há posição definida, mostrar apenas se for o nível selecionado */}
      {!posicao && (
        <mesh 
          ref={meshRef}
          position={[0, (nivel - 1) * 0.4 - 0.8, 0]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[0.9, 0.05, 0.9]} />
          <meshStandardMaterial 
            color="#D3D3D3" 
            opacity={hovered ? 0.5 : 0.1}
            transparent
          />
        </mesh>
      )}
      
      {/* Label com código da posição (apenas no hover) */}
      {hovered && (
        <Text
          position={[0, (nivel - 1) * 0.4 - 0.8 + 0.3, 0]}
          fontSize={0.1}
          color="#000"
          anchorX="center"
          anchorY="middle"
        >
          {posicao?.codigo_posicao || `C${String(corredor).padStart(2, "0")}-R${String(rua).padStart(2, "0")}-N${nivel}`}
        </Text>
      )}
    </group>
  )
}

// Componente principal da cena 3D
function WarehouseScene({ posicoes, nivelSelecionado, onPositionClick }: Warehouse3DProps) {
  // Organizar posições por corredor e rua
  const posicoesMap = useMemo(() => {
    const map = new Map()
    posicoes.forEach(pos => {
      const key = `${pos.corredor}-${pos.rua}`
      map.set(key, pos)
    })
    return map
  }, [posicoes])
  
  // Criar grade de racks (28 corredores x 21 ruas)
  const rackSections = useMemo(() => {
    const sections = []
    const spacing = 1.2 // Espaçamento entre racks
    
    for (let corredor = 1; corredor <= 28; corredor++) {
      for (let rua = 1; rua <= 21; rua++) {
        const key = `${corredor}-${rua}`
        const posicao = posicoesMap.get(key)
        
        sections.push({
          corredor,
          rua,
          position: [
            (corredor - 14) * spacing, // Centralizar
            0,
            (rua - 11) * spacing // Centralizar
          ] as [number, number, number],
          posicao
        })
      }
    }
    
    return sections
  }, [posicoesMap])
  
  return (
    <>
      {/* Iluminação ambiente suave */}
      <ambientLight intensity={0.5} />
      
      {/* Luz principal (simulando iluminação de teto) */}
      <directionalLight 
        position={[0, 20, 0]} 
        intensity={1.2} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      
      {/* Luz de preenchimento lateral */}
      <directionalLight position={[15, 10, 15]} intensity={0.5} />
      <directionalLight position={[-15, 10, -15]} intensity={0.3} />
      
      {/* Ambiente neutro */}
      <Environment preset="city" />
      
      {/* Chão com textura realista */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color="#E5E5E5" 
          roughness={0.9} 
          metalness={0.1}
        />
      </mesh>
      
      {/* Renderizar todos os racks */}
      {rackSections.map((section) => (
        <RackSection
          key={`${section.corredor}-${section.rua}`}
          position={section.position}
          corredor={section.corredor}
          rua={section.rua}
          nivel={nivelSelecionado}
          posicao={section.posicao}
          onClick={() => section.posicao && onPositionClick(section.posicao)}
        />
      ))}
    </>
  )
}

export default function Warehouse3D({ posicoes, nivelSelecionado, onPositionClick }: Warehouse3DProps) {
  return (
    <div className="w-full h-[600px] bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg overflow-hidden shadow-inner">
      <Canvas 
        shadows
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[40, 30, 40]} fov={45} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={25}
          maxDistance={120}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
        <WarehouseScene 
          posicoes={posicoes} 
          nivelSelecionado={nivelSelecionado}
          onPositionClick={onPositionClick}
        />
      </Canvas>
    </div>
  )
}

