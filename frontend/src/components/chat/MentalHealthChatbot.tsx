import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Heart, Brain, Cloud, User, Users } from 'lucide-react';

// Types for chatbot conversation flow
type Topic = 'stress' | 'anxiety' | 'depression' | 'self-esteem' | 'loneliness';
type SubOption = string;
type Phase = 'greeting' | 'topic-selection' | 'follow-up' | 'tailored-response' | 'check-in' | 'close';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  options?: string[];
}

interface ConversationState {
  phase: Phase;
  selectedTopic?: Topic;
  selectedSubOption?: SubOption;
  feelingBetter?: boolean;
}

const MentalHealthChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationState, setConversationState] = useState<ConversationState>({ phase: 'greeting' });
  const [isTyping, setIsTyping] = useState(false);
  const [showExitImage, setShowExitImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const topics = [
    { id: 'stress', label: 'Stress', icon: '😰' },
    { id: 'anxiety', label: 'Anxiety', icon: '😰' },
    { id: 'depression', label: 'Depression', icon: '😢' },
    { id: 'self-esteem', label: 'Low Self-Esteem', icon: '😔' },
    { id: 'loneliness', label: 'Loneliness', icon: '🫂' }
  ];

  const subOptions: Record<Topic, string[]> = {
    stress: ['Exams / Academic pressure', 'Assignment deadlines', 'Family expectations', 'Financial issues'],
    anxiety: ['Before exams', 'Social situations', 'About the future', 'Random moments'],
    depression: ['A few days', 'A few weeks', 'Several months', "I don't know"],
    'self-esteem': ['Academics', 'Comparing myself to others', 'Rejection', 'Family pressure'],
    loneliness: ['At school/uni', 'At home', 'Even with friends', 'Most of the time']
  };

  const tailoredResponses: Record<Topic, Record<string, string>> = {
    stress: {
      'Exams / Academic pressure': "It sounds like academic pressure is really weighing on you. Here's something that might help: Try creating a structured study plan using the Pomodoro technique (25 minutes focused study, 5 minutes break). Remember that your grades don't define your worth as a person. You're more than your academic performance.",
      'Assignment deadlines': "Deadline stress is completely understandable. Let's break this down: Try breaking large assignments into smaller, manageable chunks. Prioritize the most urgent tasks first, and don't hesitate to communicate with your lecturers if you need an extension. You're capable of handling this.",
      'Family expectations': "Family pressure can feel incredibly heavy. Your feelings are valid. Consider having an honest conversation with your family about your own goals and boundaries. If that feels too difficult right now, journaling about your feelings can be a good first step. Your path is your own.",
      'Financial issues': "Financial stress is so common among students, and you're not alone in this. Many universities offer student support services and financial aid. Consider reaching out to them - they're there to help. Budgeting apps can also help you feel more in control of your finances."
    },
    anxiety: {
      'Before exams': "Test anxiety is so real and affects so many students. Try these techniques: Practice deep breathing exercises (4-7-8 breathing), create a preparation ritual that calms you, and reframe negative thoughts like 'I'm going to fail' to 'I'll do my best with what I know'. You've prepared for this.",
      'Social situations': "Social anxiety can feel overwhelming. Try grounding techniques: focus on your five senses, name 3 things you can see, 2 you can hear, 1 you can touch. Start with small social interactions and gradually build up. Remember that many people feel anxious in social situations - you're not alone.",
      'About the future': "Future anxiety is so common, especially when everything feels uncertain. Try focusing on present actions you can take rather than worrying about what might happen. Limit doomscrolling news or social media. Set small, achievable goals for today or this week. You're capable of handling whatever comes.",
      'Random moments': "When anxiety hits without warning, try this: Box breathing (inhale 4, hold 4, exhale 4, hold 4), do a quick body scan from head to toes, or try tracking your triggers in a journal. These moments don't define you, and they will pass."
    },
    depression: {
      'A few days': "It's completely normal to have difficult days. Your feelings are valid. For now, focus on rest and one small positive action - maybe a short walk, calling a friend, or just making your bed. Small steps still count as progress. Be gentle with yourself.",
      'A few weeks': "A few weeks of feeling this way sounds really tough. You've been carrying this for a while now. I strongly encourage you to talk to someone you trust - a friend, family member, or counselor. You don't have to carry this alone. Your feelings matter, and you deserve support.",
      'Several months': "Feeling this way for months takes a real toll, and I want to acknowledge your strength in still showing up. I strongly encourage you to seek professional support - a therapist or counselor can provide tools specifically for you. If you're in crisis, please reach out to a mental health hotline. You deserve to feel better.",
      "I don't know": "It's okay to feel confused about how long you've been feeling this way. Sometimes it's hard to track. What matters is that you're reaching out now. Would you be open to speaking with a counselor? They can help you understand what you're experiencing and find the right support."
    },
    'self-esteem': {
      'Academics': "Your worth as a person has absolutely nothing to do with your grades. You are inherently valuable, period. Try celebrating small wins that aren't academic - maybe you were kind to someone, or you tried something new, or you simply got through the day. Your character matters more than your GPA.",
      'Comparing myself to others': "The comparison game is exhausting and always unfair. Consider a social media detox if you find yourself scrolling and comparing. Remember that everyone's journey is different, and you're seeing others' highlight reels, not their struggles. Your path is uniquely yours, and that's okay.",
      'Rejection': "Rejection hurts, but it's not a reflection of your worth. Every successful person has faced rejection. Try reframing it as redirection - maybe this path wasn't right for you, and something better is coming. You're capable and valuable, rejection doesn't change that.",
      'Family pressure': "Family pressure can make it hard to know what you really want. Take some time to identify your own values and goals, separate from what your family expects. You are allowed to have different dreams and priorities. Your life is yours to live."
    },
    loneliness: {
      'At school/uni': "Feeling lonely at school is surprisingly common, even when surrounded by people. Consider joining a club or organization that interests you - it's easier to connect over shared interests. Try small conversation starters: asking about assignments, complimenting something, or just saying hello.",
      'At home': "Loneliness at home can feel particularly painful. Try reaching out to just one person - a friend, family member, or even an online community. Sometimes taking that first step to connect can make a big difference. You deserve to feel connected and supported.",
      'Even with friends': "Feeling lonely around friends can be confusing and hurtful. Consider focusing on quality over quantity - maybe having deeper conversations with one or two close friends rather than surface-level interactions with many. Share how you're feeling - true friends will want to support you.",
      'Most of the time': "Feeling lonely most of the time sounds really difficult, and I want you to know that you're not alone in feeling this way. Many people struggle with loneliness. Consider seeking out peer support groups or speaking with a counselor who can help you build connections. You deserve meaningful relationships."
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, isBot: boolean, options?: string[]) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      isBot,
      timestamp: new Date(),
      options
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateTyping = (callback: () => void, delay: number = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  const handleOptionSelect = (option: string) => {
    // Handle based on current phase
    if (conversationState.phase === 'close') {
      handleCloseOption(option);
    } else {
      // Add user's choice as a message for other phases
      addMessage(option, false);

      if (conversationState.phase === 'greeting') {
        handleTopicSelection(option);
      } else if (conversationState.phase === 'follow-up') {
        handleSubOptionSelection(option);
      } else if (conversationState.phase === 'check-in') {
        handleCheckInResponse(option);
      }
    }
  };

  const handleTopicSelection = (topicLabel: string) => {
    const topic = topics.find(t => t.label === topicLabel)?.id as Topic;
    if (!topic) return;

    setConversationState(prev => ({ ...prev, phase: 'follow-up', selectedTopic: topic }));

    simulateTyping(() => {
      const empatheticResponses: Record<Topic, string> = {
        stress: "Stress is really tough, especially when it feels like it's coming from everywhere. Can you tell me what's been weighing on you most?",
        anxiety: "Anxiety can feel so overwhelming and exhausting. I'm glad you're opening up about this. What tends to trigger your anxiety the most?",
        depression: "Depression is heavy, and I want you to know that your feelings are completely valid. How long have you been feeling this way?",
        'self-esteem': "Low self-esteem can affect every part of your life, and that sounds really difficult. What tends to impact your self-worth the most?",
        loneliness: "Loneliness hurts deeply, even when you're around people. Thank you for sharing this. When do you feel most lonely?"
      };

      addMessage(empatheticResponses[topic], true, subOptions[topic]);
    });
  };

  const handleSubOptionSelection = (subOption: string) => {
    if (!conversationState.selectedTopic) return;

    setConversationState(prev => ({ ...prev, phase: 'tailored-response', selectedSubOption: subOption }));

    simulateTyping(() => {
      const response = tailoredResponses[conversationState.selectedTopic!][subOption];
      addMessage(response, true);

      simulateTyping(() => {
        addMessage("Does that feel helpful? How are you feeling right now?", true, ["Yes, a bit better", "Still struggling"]);
        setConversationState(prev => ({ ...prev, phase: 'check-in' }));
      }, 1500);
    }, 1000);
  };

  const handleCheckInResponse = (response: string) => {
    const feelingBetter = response === "Yes, a bit better";
    setConversationState(prev => ({ ...prev, phase: 'close', feelingBetter }));

    simulateTyping(() => {
      if (feelingBetter) {
        addMessage("That's a small but real step. You should be proud of yourself for reaching out and trying something new. Would you like to explore another topic, or are you ready to take a break?", true, ["Explore another topic", "Take a break"]);
      } else {
        addMessage("It sounds like you might benefit from talking to someone trained to help. That's not a weakness - it's a strength to recognize when you need more support. Would you like me to share some resources?", true, ["Yes, share resources", "I'm okay for now"]);
      }
    }, 1000);
  };

  const handleCloseOption = (option: string) => {
    // Add user's choice as a message
    addMessage(option, false);

    if (option.includes("Start over") || option.includes("Explore another topic")) {
      // Start a new session
      simulateTyping(() => {
        startNewSession();
      }, 500);
    } else if (option.includes("Exit") || option.includes("Take a break")) {
      // Show exit image and close
      simulateTyping(() => {
        addMessage("Thank you for chatting with me. Remember to take care of yourself 💛", true);
        setTimeout(() => {
          handleExit();
        }, 1500);
      }, 500);
    } else if (option.includes("resources")) {
      // Show resources
      simulateTyping(() => {
        addMessage("Here are some resources that might help:\n\n📞 Crisis Hotline: 988 (US) or your local emergency number\n\n🏫 University Counseling Services - most offer free sessions for students\n\n🌐 Online Therapy: BetterHelp, Talkspace, or similar platforms\n\n📚 Mental Health Apps: Calm, Headspace, or Insight Timer\n\nRemember - reaching out for help is a sign of strength. You deserve support.", true);
        
        simulateTyping(() => {
          addMessage("Remember — reaching out takes courage. You are not alone, and things can get better. Take care of yourself today. 💛", true, ["Start over", "Exit"]);
        }, 2000);
      }, 1000);
    } else if (option.includes("I'm okay for now")) {
      // User doesn't want resources, offer to close or continue
      simulateTyping(() => {
        addMessage("That's completely understandable. I'm here whenever you need me. Would you like to explore another topic or take a break?", true, ["Explore another topic", "Take a break"]);
      }, 1000);
    }
  };

  const startNewSession = () => {
    setMessages([]);
    setConversationState({ phase: 'greeting' });
    simulateTyping(() => {
      addMessage("Hi there 👋 I'm here to listen. What are you going through right now? Pick the one that feels closest to you:", true, topics.map(t => t.label));
    }, 500);
  };

  const handleExit = () => {
    setShowExitImage(true);
    // Show image for 3 seconds, then close and reset
    setTimeout(() => {
      setShowExitImage(false);
      setIsOpen(false);
      // Reset for next session
      setTimeout(() => {
        setMessages([]);
        setConversationState({ phase: 'greeting' });
      }, 300);
    }, 3000);
  };

  // Initialize greeting when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      simulateTyping(() => {
        addMessage("Hi there 👋 I'm here to listen. What are you going through right now? Pick the one that feels closest to you:", true, topics.map(t => t.label));
      }, 500);
    }
  }, [isOpen, messages.length]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 group"
        title="Mental Health Support"
      >
        <Heart className="w-6 h-6" />
        <span className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Mental Health Support
        </span>
      </button>
    );
  }

  return (
    <>
      {/* Exit Image Overlay */}
      {showExitImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 animate-pulse">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCjCIpswFhONZ4w84-ZExS6BDIeopuipAesF_e3uC2Dg&s"
              alt="Take care of yourself"
              className="w-full h-auto rounded-lg mb-4"
            />
            <p className="text-center text-gray-700 font-medium">Take care of yourself 💛</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Heart className="w-6 h-6" />
          <div>
            <h3 className="font-semibold">Mental Health Support</h3>
            <p className="text-xs opacity-90">I'm here to listen 💛</p>
          </div>
        </div>
        <button
          onClick={handleExit}
          className="text-white hover:bg-white/20 p-1 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.isBot
                  ? 'bg-white border border-gray-200 text-gray-800'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.text}</p>
              {message.options && (
                <div className="mt-3 space-y-2">
                  {message.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleOptionSelect(option)}
                      className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors border border-gray-300"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Confidential support • Not a crisis service
          </p>
          {conversationState.phase === 'close' && (
            <button
              onClick={startNewSession}
              className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default MentalHealthChatbot;
