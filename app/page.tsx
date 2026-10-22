'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useState, useRef } from 'react';
import { 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Database, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Search, 
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Undo
} from 'lucide-react';


// Mock order type matching our Supabase schema
interface Order {
  id: string;
  status: string;
  days_delayed: number;
}

export default function SupportAgentWorkspace() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: () => {
      // Refresh the database status after the model finishes (in case status changed)
      fetchOrders();
    }
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load orders from API route on mount
  const fetchOrders = async () => {
    setDbLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok && data) {
        setOrders(data);
      } else {
        console.error('Error fetching orders:', data.error);
      }
    } catch (err) {
      console.error('Failed to query orders API:', err);
    } finally {
      setDbLoading(false);
    }
  };

  // Reset the database values to initial mock values for clean demonstration
  const handleResetDB = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Reset error:', data.error);
      }
      await fetchOrders();
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Quick prompt triggers
  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* Background Gradient Orbs for Aesthetic Premium Feeling */}
      <div className="absolute top-0 left-0 -z-10 h-full w-full overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[128px]" />
        <div className="absolute top-1/2 right-10 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[128px]" />
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col lg:flex-row gap-8 relative z-10">
        
        {/* LEFT COLUMN: Database status & Demo tools */}
        <div className="w-full lg:w-5/12 flex flex-col gap-6">
          
          {/* Workspace Title Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Tier-1 Support Agent</h1>
                <p className="text-xs text-slate-400 font-medium">ReAct Tool Calling & Policy RAG Sandbox</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mt-4 leading-relaxed">
              This autonomous agent retrieves company policies using vector embeddings, reads/updates orders live, and executes decisions with multi-step reasoning.
            </p>
          </div>

          {/* Database Monitor Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h2 className="font-semibold text-white">Supabase Live Database</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchOrders}
                  disabled={dbLoading}
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 transition"
                  title="Refresh Database Status"
                >
                  <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleResetDB}
                  disabled={resetting}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-red-950/40 hover:text-red-300 hover:border-red-500/30 border border-slate-700 text-xs font-semibold text-slate-300 disabled:opacity-50 transition"
                  title="Reset Mock Data"
                >
                  <Undo className="w-3.5 h-3.5" />
                  Reset DB
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="flex-1 overflow-auto max-h-[220px] lg:max-h-none">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-indigo-300 font-medium">{order.id}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                          order.status === 'refunded' 
                            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                            : order.status === 'delayed'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : order.status === 'delivered'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.status === 'refunded' ? 'bg-red-400' 
                            : order.status === 'delayed' ? 'bg-amber-400'
                            : order.status === 'delivered' ? 'bg-emerald-400'
                            : 'bg-blue-400'
                          }`} />
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {order.days_delayed > 0 ? `${order.days_delayed}d` : '-'}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && !dbLoading && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">
                        No orders found. Run the SQL schema script in Supabase!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Simulated Policy Context Sandbox */}
            <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-950/40 rounded-xl p-3 border border-slate-800/50">
              <h3 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Active Knowledge Policies
              </h3>
              <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed list-disc list-inside">
                <li>Refunds allowed only if delayed <span className="text-indigo-300 font-semibold">&gt; 5 days</span>.</li>
                <li>Delayed by 5 days or less must be checked/waited.</li>
                <li>Refunds cannot be requested twice for already refunded orders.</li>
              </ul>
            </div>

          </div>

          {/* Prompt Sandbox Selector */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" />
              Interactive Test Scenarios
            </h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleQuickPrompt('My order ORD-1002 is delayed. Can I get a refund?')}
                className="w-full text-left text-xs bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-lg p-2.5 transition flex items-center justify-between text-slate-300 group"
              >
                <span>Refund for delayed ORD-1002 (&gt;5 days)</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>
              <button
                onClick={() => handleQuickPrompt('Can you refund order ORD-1004? It is a few days delayed.')}
                className="w-full text-left text-xs bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-lg p-2.5 transition flex items-center justify-between text-slate-300 group"
              >
                <span>Refund for delayed ORD-1004 (2 days - Should decline)</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>
              <button
                onClick={() => handleQuickPrompt('Is my package ORD-1003 shipped? What is the policy on return times?')}
                className="w-full text-left text-xs bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-lg p-2.5 transition flex items-center justify-between text-slate-300 group"
              >
                <span>Query ORD-1003 & returns policy</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: The Chat Interface */}
        <div className="w-full lg:w-7/12 flex flex-col h-[700px] bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h2 className="font-semibold text-white">Autonomous Agent Chat</h2>
                <p className="text-xs text-slate-400">Stream initialized with Gemini</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4 scrollbar-thin">
            
            {/* Initial System Intro Bubble */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl rounded-tl-none p-4 max-w-[85%] text-slate-300 text-sm leading-relaxed shadow-lg">
                Hello! I am your Support AI Agent. I can check order statuses and authorize refunds in line with company policies. How can I help you today?
              </div>
            </div>

            {/* Chat History */}
            {messages.map((message) => {
              const isUser = message.role === 'user';
              
              return (
                <div key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                  
                  {/* Left Icon for Assistant */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    
                    {/* Render Message Parts (v5.0+ text and tool invocation parts) */}
                    {message.parts && message.parts.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return (
                          <div 
                            key={partIndex} 
                            className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md border ${
                              isUser 
                                ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                                : 'bg-slate-800/60 text-slate-200 border-slate-700/50 rounded-tl-none'
                            }`}
                          >
                            {part.text}
                          </div>
                        );
                      }

                      if (part.type.startsWith('tool-') || part.type === 'dynamic-tool') {
                        const toolPart = part as any;
                        const toolCallId = toolPart.toolCallId;
                        const toolName = toolPart.toolName || part.type.replace('tool-', '');
                        const state = toolPart.state;
                        const inputVal = toolPart.input;
                        const outputVal = toolPart.output;

                        const isPending = state === 'input-streaming' || state === 'input-available';

                        return (
                          <div 
                            key={toolCallId || partIndex} 
                            className="mt-1.5 w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm text-xs"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-indigo-300 font-mono flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5 text-indigo-400" />
                                {toolName}
                              </span>
                              
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full animate-pulse">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                  Checking database...
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Action completed
                                </span>
                              )}
                            </div>

                            {/* Arguments Details */}
                            <div className="grid grid-cols-1 gap-1 text-slate-400 mt-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                              <div>
                                <span className="font-medium text-slate-300">Input Order ID:</span>{' '}
                                <code className="text-indigo-200 font-semibold">{inputVal?.orderId || 'N/A'}</code>
                              </div>
                              
                              {!isPending && outputVal && (
                                <div className="mt-1.5 pt-1.5 border-t border-slate-800">
                                  <span className="font-semibold text-slate-300">Tool Result:</span>
                                  {outputVal.error ? (
                                    <div className="text-red-400 font-semibold flex items-center gap-1 mt-1 bg-red-950/20 p-1.5 rounded border border-red-500/20">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      {outputVal.error}
                                    </div>
                                  ) : (
                                    <div className="text-slate-300 mt-1 space-y-1">
                                      {toolName === 'checkOrderStatus' && (
                                        <>
                                          <div>• Current Status: <span className="text-indigo-300 font-semibold">{outputVal.status}</span></div>
                                          <div>• Days Delayed: <span className="text-indigo-300 font-semibold">{outputVal.daysDelayed}d</span></div>
                                        </>
                                      )}
                                      {toolName === 'processRefund' && (
                                        <div className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-950/20 p-1.5 rounded border border-emerald-500/20">
                                          <ShieldCheck className="w-3.5 h-3.5" />
                                          {outputVal.message}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}

                  </div>

                  {/* Right Icon for User */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <div className="text-white text-xs font-bold">U</div>
                    </div>
                  )}

                </div>
              );
            })}

            {/* Waiting for response stream loader */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="bg-slate-800/40 border border-slate-800/80 rounded-2xl rounded-tl-none p-4 max-w-[85%] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-sm text-slate-400">Agent is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <form onSubmit={handleSubmit} className="relative mt-auto border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 focus-within:border-indigo-500/80 rounded-xl p-2 transition shadow-inner">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about order ORD-1002 or ask policy questions..."
                className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-sm text-white px-3 py-2 disabled:opacity-50 placeholder-slate-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex items-center justify-center p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
