"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthService } from "@/lib/auth-service"
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react"

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  usuario: string
  area: string
  onSuccess?: () => void
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  usuario,
  area,
  onSuccess
}: ChangePasswordModalProps) {
  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const resetForm = () => {
    setSenhaAtual("")
    setNovaSenha("")
    setConfirmarSenha("")
    setError("")
    setSuccess(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const validateForm = () => {
    if (!senhaAtual.trim()) {
      setError("Digite a senha atual")
      return false
    }

    if (!novaSenha.trim()) {
      setError("Digite a nova senha")
      return false
    }

    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem")
      return false
    }

    if (senhaAtual === novaSenha) {
      setError("A nova senha deve ser diferente da senha atual")
      return false
    }

    // Validar critérios da nova senha
    const validation = AuthService.validatePassword(novaSenha)
    if (!validation.valid) {
      setError(validation.errors.join(", "))
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    setError("")

    try {
      const result = await AuthService.changePassword(usuario, senhaAtual, novaSenha, area)
      
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          handleClose()
          onSuccess?.()
        }, 2000)
      } else {
        setError(result.error || "Erro ao alterar senha")
      }
    } catch (error) {
      console.error("Erro ao alterar senha:", error)
      setError("Erro interno. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: "", color: "" }
    
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8) strength++
    if (/\d/.test(password)) strength++
    if (/[a-zA-Z]/.test(password)) strength++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++

    const labels = ["Muito fraca", "Fraca", "Regular", "Boa", "Muito boa"]
    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"]
    
    return {
      strength,
      label: labels[strength - 1] || "",
      color: colors[strength - 1] || "bg-gray-300"
    }
  }

  const passwordStrength = getPasswordStrength(novaSenha)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <span>Alterar Senha</span>
          </DialogTitle>
          <DialogDescription>
            Digite sua nova senha para alterar a senha atual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {success ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Senha alterada com sucesso!
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuário</Label>
                <Input
                  id="usuario"
                  value={usuario}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha Atual *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="senhaAtual"
                    type={showSenhaAtual ? "text" : "password"}
                    placeholder="Digite sua senha atual"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                  >
                    {showSenhaAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="novaSenha"
                    type={showNovaSenha ? "text" : "password"}
                    placeholder="Digite a nova senha"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                  >
                    {showNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Indicador de força da senha */}
                {novaSenha && (
                  <div className="space-y-1">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded ${
                            level <= passwordStrength.strength
                              ? passwordStrength.color
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">
                      Força: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="confirmarSenha"
                    type={showConfirmarSenha ? "text" : "password"}
                    placeholder="Confirme a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                  >
                    {showConfirmarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Critérios da senha */}
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-medium">Critérios da senha:</p>
                <ul className="space-y-1">
                  <li className={`flex items-center space-x-1 ${novaSenha.length >= 6 ? "text-green-600" : "text-gray-500"}`}>
                    <span>{novaSenha.length >= 6 ? "✓" : "○"}</span>
                    <span>Pelo menos 6 caracteres</span>
                  </li>
                  <li className={`flex items-center space-x-1 ${/\d/.test(novaSenha) ? "text-green-600" : "text-gray-500"}`}>
                    <span>{/\d/.test(novaSenha) ? "✓" : "○"}</span>
                    <span>Pelo menos um número</span>
                  </li>
                  <li className={`flex items-center space-x-1 ${/[a-zA-Z]/.test(novaSenha) ? "text-green-600" : "text-gray-500"}`}>
                    <span>{/[a-zA-Z]/.test(novaSenha) ? "✓" : "○"}</span>
                    <span>Pelo menos uma letra</span>
                  </li>
                </ul>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
