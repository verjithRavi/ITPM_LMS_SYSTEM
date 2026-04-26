"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface Message {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    userId: string;
    role: string;
  };
  content: string;
  timestamp: string;
  readAt?: string;
}

interface Chat {
  _id: string;
  participants: Array<{
    user: {
      _id: string;
      fullName: string;
      userId: string;
      role: string;
    };
    role: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  lastMessageAt: string;
}

export default function AdminChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const token = getToken();

  useEffect(() => {
    if (token) {
      loadChats();
    }
  }, [token]);

  const loadChats = async () => {
    try {
      const data = await apiFetch<Chat[]>("/api/chat", {}, token!);
      setChats(data);
    } catch (error) {
      console.error("Error loading chats:", error);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const data = await apiFetch<Message[]>(`/api/chat/${chatId}/messages`, {}, token!);
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    setSendingMessage(true);
    try {
      const message = await apiFetch<Message>(`/api/chat/${selectedChat._id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: newMessage.trim() }),
      }, token!);

      setMessages(prev => [...prev, message]);
      setNewMessage("");
      loadChats(); // Refresh chats to update last message
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat._id);
  };

  const getChatName = (chat: Chat) => {
    const student = chat.participants.find(p => p.user.role === "STUDENT");
    return student ? `${student.user.fullName} (${student.user.userId})` : "Unknown";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full rounded-lg border border-gray-200 bg-white">
      <div className="flex h-full">
        {/* Chat List */}
        <div className="w-80 border-r border-gray-200">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Student Chats</h2>
            <p className="text-sm text-gray-500">Manage conversations with students</p>
          </div>
          
          <div className="h-[calc(100%-73px)] overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="mt-2">No active chats</p>
                <p className="text-sm">Students can start chats from their dashboard</p>
              </div>
            ) : (
              chats.map(chat => (
                <div
                  key={chat._id}
                  onClick={() => selectChat(chat)}
                  className={`cursor-pointer border-b border-gray-100 p-4 hover:bg-gray-50 ${
                    selectedChat?._id === chat._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{getChatName(chat)}</h4>
                      {chat.lastMessage && (
                        <p className="mt-1 truncate text-sm text-gray-500">
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex-shrink-0 text-right">
                      <div className="text-xs text-gray-400">
                        {chat.lastMessageAt && (
                          <>
                            {formatDate(chat.lastMessageAt)}
                            <br />
                            {formatTime(chat.lastMessageAt)}
                          </>
                        )}
                      </div>
                      {chat.unreadCount > 0 && (
                        <span className="mt-1 inline-flex rounded-full bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        {selectedChat ? (
          <div className="flex flex-1 flex-col">
            {/* Chat Header */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{getChatName(selectedChat)}</h3>
                  <p className="text-sm text-gray-500">Student</p>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedChat.unreadCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                      {selectedChat.unreadCount} unread
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message._id}
                    className={`flex ${message.sender.role === "ADMIN" ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                        message.sender.role === "ADMIN"
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`mt-1 text-xs ${
                        message.sender.role === "ADMIN" ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Select a conversation</h3>
              <p className="mt-1 text-gray-500">Choose a student chat from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
