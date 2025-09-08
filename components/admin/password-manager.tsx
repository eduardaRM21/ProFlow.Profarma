"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthService } from "@/lib/auth-service"
import { Copy, Eye, EyeOff, Key } from "lucide-react"

export default function PasswordManager() {
  const [password, setPassword] = useState("")
  const [generatedHash, setGeneratedHash] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [commonPasswords, setCommonPasswords] = useState<Array<{password: string, hash: string}>>([])

  const generateHash = () => {
    if (!password.trim()) {
      alert("Digite uma senha para gerar o hash")
      return
    }
    
    const hash = AuthService.createPasswordHash(password)
    setGeneratedHash(hash)
  }

  const loadCommonPasswords = () => {
    const passwords = AuthService.getCommonPasswords()
    setCommonPasswords(passwords)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Hash copiado para a área de transferência!")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-600" />
            <span>Gerador de Hash de Senhas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="flex space-x-2">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button onClick={generateHash} className="w-full">
            Gerar Hash
          </Button>

          {generatedHash && (
            <div className="space-y-2">
              <Label>Hash Gerado</Label>
              <div className="flex space-x-2">
                <Input
                  value={generatedHash}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedHash)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senhas Comuns e Seus Hashes</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={loadCommonPasswords} className="mb-4">
            Carregar Senhas Comuns
          </Button>

          {commonPasswords.length > 0 && (
            <div className="space-y-2">
              {commonPasswords.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-2 bg-gray-50 rounded">
                  <span className="font-mono text-sm w-20">{item.password}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono text-sm flex-1">{item.hash}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(item.hash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemplo de Uso no Código</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`import { AuthService } from "@/lib/auth-service"

// Gerar hash de uma senha
const hash = AuthService.createPasswordHash("minhasenha123")
console.log("Hash:", hash)

// Verificar senha
const isValid = AuthService.authenticateUser("usuario", "senha", "area")

// Gerar hash com informações
const hashInfo = AuthService.generatePasswordHash("senha123")
console.log("Senha:", hashInfo.password)
console.log("Hash:", hashInfo.hash)`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
