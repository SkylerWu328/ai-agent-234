import React, { useEffect, useState, useRef } from 'react';

type Message = {
  id: number;
  role: 'user' | 'ai';
  content: string;
};

type CommentatorAgentProps = {
  messages: Message[];
};

// API配置复用现有的配置
const API_CONFIG = {
  baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  model: 'THUDM/glm-4-9b-chat',
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || '',
};

const COMMENTATOR_SYSTEM_PROMPT = `你是一个评论员，负责对用户提供的观点进行评论。你的评论需要包含以下要素：

1.  提出与原观点相反或质疑的意见。
2.  使用阴阳怪气的语气，例如讽刺、反问、暗示等。
3.  字数限制在30字以内。
4.  添加一个表示无奈、嘲讽或不屑的emoji。

请注意避免人身攻击和过激言论。`;

const CommentatorAgent: React.FC<CommentatorAgentProps> = ({ messages }) => {
  const [comment, setComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<number>(0);
  const isGeneratingRef = useRef(false);

  const generateComment = async () => {
    if (isGeneratingRef.current || 
        messages.length === 0 || 
        messages[messages.length - 1].id === lastMessageId) return;
    
    isGeneratingRef.current = true;
    setIsLoading(true);
    
    try {
      // 将对话历史格式化为文本
      const conversationHistory = messages
        .map(msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
        .join('\n');

      const response = await fetch(API_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            {
              role: 'system',
              content: COMMENTATOR_SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: `请分析以下对话:\n\n${conversationHistory}`
            }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error('评论生成失败');
      }

      const data = await response.json();
      const commentText = data.choices[0]?.message?.content || '无法生成评论';
      setComment(commentText);
      
      if (messages.length > 0) {
        setLastMessageId(messages[messages.length - 1].id);
      }

    } catch (error) {
      console.error('评论生成错误:', error);
      setComment('评论生成失败，请稍后再试。');
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  useEffect(() => {
    generateComment();
  }, [messages]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      <h3 className="font-bold mb-2">评论员的思考</h3>
      {isLoading ? (
        <p className="text-gray-500">正在分析对话...</p>
      ) : (
        <p className="text-gray-700">{comment}</p>
      )}
    </div>
  );
};

export default CommentatorAgent; 