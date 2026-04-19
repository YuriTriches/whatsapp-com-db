import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, CheckCheck, Smile, Send, Settings, LogOut, Lock, ArrowLeft, Bell } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';


const SUPABASE_URL = '';
const SUPABASE_KEY = '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [tela, setTela] = useState<'login' | 'registro' | 'chat'>('login');
  const [abaConfig, setAbaConfig] = useState(false);
  const [mostrarEmoji, setMostrarEmoji] = useState(false);
  const [usuario, setUsuario] = useState<any>({ id: null, nome: '', foto_url: '', senha: '' });
  const [contatoAtivo, setContatoAtivo] = useState<any>(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [listaContatos, setListaContatos] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. PERSISTÊNCIA DE LOGIN (LOCALSTORAGE)
  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('zap_usuario');
    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo));
      setTela('chat');
    }
  }, []);

  // 2. CARREGAR DADOS E REALTIME
  useEffect(() => {
    if (tela === 'chat' && usuario.id) {
      const buscarContatos = async () => {
        const { data } = await supabase.from('usuarios').select('*').neq('id', usuario.id);
        if (data) setListaContatos(data);
      };

      const buscarMensagens = async () => {
        const { data } = await supabase.from('mensagens').select('*').order('enviada_em', { ascending: true });
        if (data) setMensagens(data);
      };

      buscarContatos();
      buscarMensagens();

      const canalMsg = supabase
        .channel('realtime-mensagens')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setMensagens((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setMensagens((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(canalMsg); };
    }
  }, [tela, usuario.id]);

  // 3. MARCAR COMO LIDA
  useEffect(() => {
    const marcarLida = async () => {
      if (contatoAtivo && usuario.id) {
        await supabase.from('mensagens').update({ lida: true })
          .eq('remetente_id', contatoAtivo.id).eq('destinatario_id', usuario.id).eq('lida', false);
      }
    };
    marcarLida();
  }, [contatoAtivo, mensagens]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // 4. AUTH E PERFIL
  const lidarAuth = async (e: React.FormEvent, tipo: 'login' | 'registro') => {
    e.preventDefault();
    let user;
    if (tipo === 'registro') {
      const { data, error } = await supabase.from('usuarios').insert([{ nome: usuario.nome, senha: usuario.senha, foto_url: usuario.foto_url }]).select().single();
      if (error) return alert("Erro ao registrar");
      user = data;
    } else {
      const { data, error } = await supabase.from('usuarios').select('*').eq('nome', usuario.nome).eq('senha', usuario.senha).maybeSingle();
      if (error || !data) return alert("Usuário ou senha incorretos!");
      user = data;
    }
    setUsuario(user);
    localStorage.setItem('zap_usuario', JSON.stringify(user));
    setTela('chat');
  };

  const logout = () => {
    localStorage.removeItem('zap_usuario');
    window.location.reload();
  };

  const enviarMensagem = async (e: any) => {
    if (e.preventDefault) e.preventDefault();
    if (!novaMensagem.trim() || !contatoAtivo) return;
    await supabase.from('mensagens').insert([{ remetente_id: usuario.id, destinatario_id: contatoAtivo.id, conteudo: novaMensagem, lida: false }]);
    setNovaMensagem('');
    setMostrarEmoji(false);
  };

  // 5. LÓGICA DE PREVIEW E NOTIFICAÇÃO
  const getNaoLidas = (contatoId: string) => {
    return mensagens.filter(m => m.remetente_id === contatoId && m.destinatario_id === usuario.id && !m.lida).length;
  };

  const getUltimaMensagem = (contatoId: string) => {
    const conversa = mensagens.filter(m => 
      (m.remetente_id === usuario.id && m.destinatario_id === contatoId) || 
      (m.remetente_id === contatoId && m.destinatario_id === usuario.id)
    );
    if (conversa.length === 0) return "Clique para conversar";
    const ultima = conversa[conversa.length - 1];
    const prefixo = ultima.remetente_id === usuario.id ? "Você: " : "";
    return `${prefixo}${ultima.conteudo}`;
  };

  if (tela !== 'chat') {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center border-t-[10px] border-[#00a884]">
        <div className="bg-white p-10 rounded-lg shadow-xl w-[90%] max-w-[400px] text-center">
          <MessageSquare size={60} className="mx-auto mb-4 text-[#00a884]" fill="currentColor" />
          <h2 className="text-2xl font-light mb-6">{tela === 'login' ? 'Login' : 'Criar Conta'}</h2>
          <form onSubmit={(e) => lidarAuth(e, tela)} className="space-y-4">
            <input className="w-full p-3 border rounded outline-none" type="text" placeholder="Nome" required onChange={(e) => setUsuario({...usuario, nome: e.target.value})} />
            <input className="w-full p-3 border rounded outline-none" type="password" placeholder="Senha" required onChange={(e) => setUsuario({...usuario, senha: e.target.value})} />
            <button className="w-full bg-[#00a884] text-white py-3 rounded font-bold"> {tela === 'login' ? 'ENTRAR' : 'CADASTRAR'}</button>
          </form>
          <button onClick={() => setTela(tela === 'login' ? 'registro' : 'login')} className="mt-4 text-sm text-[#00a884] hover:underline">
            {tela === 'login' ? 'Não tem conta? Registre-se' : 'Já tem conta? Faça login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#dadbd3] md:flex md:items-center md:justify-center overflow-hidden font-sans">
      <div className="hidden md:block absolute top-0 left-0 w-full h-[127px] bg-[#00a884] z-0"></div>
      <div className="w-full md:w-[95%] md:max-w-[1600px] h-full md:h-[95vh] bg-[#f0f2f5] flex shadow-2xl z-10 md:rounded-sm overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className={`${(contatoAtivo && !abaConfig) ? 'hidden' : 'flex'} md:flex w-full md:w-[400px] bg-white border-r border-gray-300 flex-col`}>
          <header className="bg-[#f0f2f5] p-4 flex justify-between items-center">
            <img src={usuario.foto_url || 'https://www.pngall.com/wp-content/uploads/5/Profile-PNG-File.png'} className="w-10 h-10 rounded-full cursor-pointer object-cover" onClick={() => setAbaConfig(true)} />
            <div className="flex gap-4 text-[#54656f]">
              <Settings size={22} className="cursor-pointer hover:text-[#00a884]" onClick={() => setAbaConfig(true)} />
              <LogOut size={22} className="cursor-pointer hover:text-red-500" onClick={logout} />
            </div>
          </header>

          {abaConfig ? (
            <div className="flex-1 p-6 bg-white animate-in slide-in-from-left duration-300">
              <h3 className="text-[#008069] font-bold mb-6 text-xl">Perfil</h3>
              <div className="space-y-6">
                <input type="text" placeholder="URL da Foto" className="w-full p-2 border-b outline-none" value={usuario.foto_url} onChange={(e) => setUsuario({...usuario, foto_url: e.target.value})} />
                <input type="text" placeholder="Nome" className="w-full p-2 border-b outline-none" value={usuario.nome} onChange={(e) => setUsuario({...usuario, nome: e.target.value})} />
                <button onClick={() => { supabase.from('usuarios').update(usuario).eq('id', usuario.id); setAbaConfig(false); localStorage.setItem('zap_usuario', JSON.stringify(usuario)); }} className="w-full bg-[#00a884] text-white py-3 rounded font-bold shadow-md">SALVAR</button>
                <button onClick={() => setAbaConfig(false)} className="w-full text-gray-500 py-2">Voltar</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {listaContatos.map((c) => {
                const n = getNaoLidas(c.id);
                const ultima = getUltimaMensagem(c.id);
                return (
                  <div key={c.id} onClick={() => setContatoAtivo(c)} className={`flex p-4 cursor-pointer hover:bg-[#f5f6f6] border-b items-center ${contatoAtivo?.id === c.id ? 'bg-[#ebebeb]' : ''}`}>
                    <img src={c.foto_url || 'https://www.pngall.com/wp-content/uploads/5/Profile-PNG-File.png'} className="w-12 h-12 rounded-full mr-4 object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-[#111b21] truncate">{c.nome}</span>
                        {n > 0 && <div className="flex items-center gap-1 animate-bounce text-[#25d366]"><Bell size={14} fill="currentColor"/><span className="text-[10px] font-bold">{n}</span></div>}
                      </div>
                      <p className={`text-sm truncate ${n > 0 ? 'text-[#25d366] font-medium' : 'text-gray-500'}`}>{ultima}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* ÁREA DO CHAT */}
        <main className={`${(!contatoAtivo || abaConfig) ? 'hidden' : 'flex'} md:flex flex-1 flex flex-col bg-[#efeae2] relative`}>
          {contatoAtivo ? (
            <>
              <header className="bg-[#f0f2f5] p-3 flex items-center border-l border-gray-300 shadow-sm z-10">
                <button onClick={() => setContatoAtivo(null)} className="md:hidden mr-3 text-[#54656f]"><ArrowLeft size={24} /></button>
                <img src={contatoAtivo.foto_url || 'https://www.pngall.com/wp-content/uploads/5/Profile-PNG-File.png'} className="w-10 h-10 rounded-full mr-3 object-cover" />
                <h4 className="font-semibold truncate">{contatoAtivo.nome}</h4>
              </header>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-40 flex flex-col">
                {mensagens.filter(m => (m.remetente_id === usuario.id && m.destinatario_id === contatoAtivo.id) || (m.remetente_id === contatoAtivo.id && m.destinatario_id === usuario.id)).map((msg, i) => (
                  <div key={i} className={`p-2 rounded-lg shadow-sm max-w-[85%] md:max-w-[65%] ${msg.remetente_id === usuario.id ? 'bg-[#d9fdd3] self-end' : 'bg-white self-start'}`}>
                    <p className="text-sm md:text-base">{msg.conteudo}</p>
                    <span className="text-[10px] text-gray-400 block text-right mt-1">
                      {msg.enviada_em ? new Date(msg.enviada_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      {msg.remetente_id === usuario.id && <CheckCheck size={14} className={`inline ml-1 ${msg.lida ? 'text-[#53bdeb]' : 'text-gray-400'}`} />}
                    </span>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>

              {/* BARRA DE EMOJIS */}
              {mostrarEmoji && (
                <div className="absolute bottom-[62px] left-0 z-50 w-full md:w-auto">
                  <EmojiPicker onEmojiClick={(emojiData) => setNovaMensagem(prev => prev + emojiData.emoji)} width="100%" height={350} />
                </div>
              )}

              <form onSubmit={enviarMensagem} className="bg-[#f0f2f5] p-3 flex items-center gap-2 border-t relative">
                <button type="button" onClick={() => setMostrarEmoji(!mostrarEmoji)} className={`p-1 rounded-full ${mostrarEmoji ? 'text-[#00a884]' : 'text-[#54656f]'}`}>
                  <Smile size={26} />
                </button>
                <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} className="flex-1 p-2 rounded-lg outline-none" placeholder="Digite uma mensagem" onFocus={() => setMostrarEmoji(false)} />
                <button type="submit" className="bg-[#00a884] text-white p-2 rounded-full"><Send size={24} /></button>
              </form>
            </>
          ) : (
            <div className="hidden md:flex m-auto text-center flex-col items-center opacity-50 px-4">
              <MessageSquare size={100} className="text-[#00a884] mb-4" />
              <h2 className="text-3xl font-light">WhatsApp Supabase</h2>
              <p className="mt-2 text-sm border-t pt-4"><Lock size={12} className="inline mr-1" /> Conectado e Seguro.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
