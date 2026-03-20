import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, MessageSquare, CheckCheck, Paperclip, Smile, Send, Settings, LogOut, Lock } from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_KEY = 'SUA_KEY_ANON_AQUI';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [tela, setTela] = useState<'login' | 'registro' | 'chat'>('login');
  const [abaConfig, setAbaConfig] = useState(false);
  const [usuario, setUsuario] = useState<any>({ id: null, nome: '', foto_url: '', senha: '' });
  const [contatoAtivo, setContatoAtivo] = useState<any>(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [listaContatos, setListaContatos] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. CARREGAR DADOS E REALTIME
  useEffect(() => {
    if (tela === 'chat' && usuario.id) {
      // Buscar Contatos
      const buscarContatos = async () => {
        const { data } = await supabase.from('usuarios').select('*').neq('id', usuario.id);
        if (data) setListaContatos(data);
      };

      // Buscar Mensagens Iniciais
      const buscarMensagens = async () => {
        const { data } = await supabase.from('mensagens').select('*');
        if (data) setMensagens(data);
      };

      buscarContatos();
      buscarMensagens();

      // INSCRIÇÃO REALTIME (Ouve novas mensagens no banco)
      const canal = supabase
        .channel('chat-geral')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (payload) => {
          setMensagens((prev) => [...prev, payload.new]);
        })
        .subscribe();

      return () => { supabase.removeChannel(canal); };
    }
  }, [tela, usuario.id]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // 2. AUTH (LOGIN / REGISTRO)
  const lidarAuth = async (e: React.FormEvent, tipo: 'login' | 'registro') => {
    e.preventDefault();
    if (tipo === 'registro') {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{ nome: usuario.nome, senha: usuario.senha, foto_url: usuario.foto_url }])
        .select().single();
      
      if (error) return alert("Erro ao registrar: " + error.message);
      setUsuario(data);
      setTela('chat');
    } else {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('nome', usuario.nome)
        .eq('senha', usuario.senha)
        .single();

      if (error || !data) return alert("Usuário ou senha incorretos!");
      setUsuario(data);
      setTela('chat');
    }
  };

  // 3. ENVIAR MENSAGEM
  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !contatoAtivo) return;

    const { error } = await supabase.from('mensagens').insert([
      { 
        remetente_id: usuario.id, 
        destinatario_id: contatoAtivo.id, 
        conteudo: novaMensagem 
      }
    ]);

    if (error) alert("Erro ao enviar!");
    setNovaMensagem('');
  };

  // 4. ATUALIZAR PERFIL
  const salvarPerfil = async () => {
    const { error } = await supabase
      .from('usuarios')
      .update({ nome: usuario.nome, foto_url: usuario.foto_url, senha: usuario.senha })
      .eq('id', usuario.id);
    
    if (error) return alert("Erro ao atualizar!");
    alert("Perfil atualizado!");
    setAbaConfig(false);
  };

  if (tela !== 'chat') {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center border-t-[10px] border-[#00a884]">
        <div className="bg-white p-10 rounded-lg shadow-xl w-[400px] text-center">
          <MessageSquare size={60} className="mx-auto mb-4 text-[#00a884]" fill="currentColor" />
          <h2 className="text-2xl font-light mb-6">{tela === 'login' ? 'Login' : 'Criar Conta'}</h2>
          <form onSubmit={(e) => lidarAuth(e, tela)} className="space-y-4">
            <input className="w-full p-3 border rounded outline-none" type="text" placeholder="Nome" required onChange={(e) => setUsuario({...usuario, nome: e.target.value})} />
            <input className="w-full p-3 border rounded outline-none" type="password" placeholder="Senha" required onChange={(e) => setUsuario({...usuario, senha: e.target.value})} />
            <button className="w-full bg-[#00a884] text-white py-3 rounded font-bold hover:bg-[#018a6d]">
              {tela === 'login' ? 'ENTRAR' : 'CADASTRAR'}
            </button>
          </form>
          <button onClick={() => setTela(tela === 'login' ? 'registro' : 'login')} className="mt-4 text-sm text-[#00a884] hover:underline">
            {tela === 'login' ? 'Não tem conta? Registre-se' : 'Já tem conta? Faça login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#dadbd3] flex items-center justify-center overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-[127px] bg-[#00a884] z-0"></div>
      <div className="w-[95%] max-w-[1600px] h-[95vh] bg-[#f0f2f5] flex shadow-2xl z-10 rounded-sm overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-[400px] bg-white border-r border-gray-300 flex flex-col">
          <header className="bg-[#f0f2f5] p-4 flex justify-between items-center">
            <img src={usuario.foto_url || 'https://www.pngall.com/wp-content/uploads/5/Profile-PNG-File.png'} className="w-10 h-10 rounded-full cursor-pointer object-cover" onClick={() => setAbaConfig(true)} />
            <div className="flex gap-4 text-[#54656f]">
              <Settings size={22} className="cursor-pointer hover:text-[#00a884]" onClick={() => setAbaConfig(true)} />
              <LogOut size={22} className="cursor-pointer hover:text-red-500" onClick={() => window.location.reload()} />
            </div>
          </header>

          {abaConfig ? (
            <div className="flex-1 p-6 bg-white animate-in slide-in-from-left duration-300">
              <h3 className="text-[#008069] font-bold mb-6 text-xl">Perfil</h3>
              <div className="space-y-6">
                <input type="text" placeholder="URL da Foto" className="w-full p-2 border-b outline-none" value={usuario.foto_url} onChange={(e) => setUsuario({...usuario, foto_url: e.target.value})} />
                <input type="text" placeholder="Nome" className="w-full p-2 border-b outline-none" value={usuario.nome} onChange={(e) => setUsuario({...usuario, nome: e.target.value})} />
                <button onClick={salvarPerfil} className="w-full bg-[#00a884] text-white py-3 rounded font-bold">SALVAR</button>
                <button onClick={() => setAbaConfig(false)} className="w-full text-gray-500 py-2">Voltar</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {listaContatos.map((c) => (
                <div key={c.id} onClick={() => setContatoAtivo(c)} className={`flex p-4 cursor-pointer hover:bg-[#f5f6f6] border-b ${contatoAtivo?.id === c.id ? 'bg-[#ebebeb]' : ''}`}>
                  <img src={c.foto_url || 'https://www.pngall.com/wp-content/uploads/5/Profile-PNG-File.png'} className="w-12 h-12 rounded-full mr-4 object-cover" />
                  <div className="flex-1">
                    <span className="font-medium text-[#111b21]">{c.nome}</span>
                    <p className="text-sm text-gray-500">Clique para conversar</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* CHAT AREA */}
        <main className="flex-1 flex flex-col bg-[#efeae2] relative">
          {contatoAtivo ? (
            <>
              <header className="bg-[#f0f2f5] p-3 flex items-center border-l border-gray-300 shadow-sm z-10">
                <img src={contatoAtivo.foto_url || 'https://www.pngall.com/wp-content/uploads/5/Profile-PNG-File.png'} className="w-10 h-10 rounded-full mr-3 object-cover" />
                <h4 className="font-semibold">{contatoAtivo.nome}</h4>
              </header>
              <div className="flex-1 p-8 overflow-y-auto space-y-3 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-40 flex flex-col">
                {mensagens.filter(m => (m.remetente_id === usuario.id && m.destinatario_id === contatoAtivo.id) || (m.remetente_id === contatoAtivo.id && m.destinatario_id === usuario.id)).map((msg, i) => (
                  <div key={i} className={`p-2 rounded-lg shadow-sm max-w-[65%] ${msg.remetente_id === usuario.id ? 'bg-[#d9fdd3] self-end' : 'bg-white self-start'}`}>
                    <p>{msg.conteudo}</p>
                    <span className="text-[10px] text-gray-400 block text-right">
                      {new Date(msg.enviada_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {msg.remetente_id === usuario.id && <CheckCheck size={14} className="inline ml-1 text-[#53bdeb]" />}
                    </span>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
              <form onSubmit={enviarMensagem} className="bg-[#f0f2f5] p-3 flex items-center gap-4 border-l border-gray-300">
                <Smile size={26} className="text-[#54656f]" />
                <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} className="flex-1 p-3 rounded-lg outline-none" placeholder="Digite uma mensagem" />
                <button type="submit" className="text-[#54656f] hover:text-[#00a884]"><Send size={26} /></button>
              </form>
            </>
          ) : (
            <div className="m-auto text-center flex flex-col items-center opacity-50">
              <MessageSquare size={100} className="mb-4" />
              <h2 className="text-3xl font-light">WhatsApp Supabase</h2>
              <p className="mt-2 text-sm border-t pt-4"><Lock size={12} className="inline" /> Suas conversas estão salvas na nuvem.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
export default App;