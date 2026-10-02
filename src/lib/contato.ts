/** Monta o link wa.me a partir de um telefone brasileiro digitado de qualquer jeito. */
export function linkWhatsApp(telefone: string, mensagem?: string): string {
  let digitos = telefone.replace(/\D/g, '');
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (digitos.length < 12 || digitos.length > 13) {
    throw new Error(`Telefone inválido para WhatsApp: "${telefone}"`);
  }
  const url = `https://wa.me/${digitos}`;
  return mensagem ? `${url}?text=${encodeURIComponent(mensagem)}` : url;
}

export function linkInstagram(usuario: string): string {
  return `https://instagram.com/${usuario.trim().replace(/^@/, '')}`;
}
