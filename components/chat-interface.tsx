'use client'

import { useState, useRef, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Paperclip, Globe, Mic, Send } from 'lucide-react'

// 定义消息类型
type Message = {
  id: number
  content: string
  role: 'user' | 'ai' | 'captain' | 'crew' | 'siren' | 'passenger'
}

// 添加类型定义
type StreamChunk = {
  choices: {
    delta: {
      content?: string
    }
  }[]
}

// 添加新的类型定义
type SearchResult = {
  title: string;
  snippet: string;
  link: string;
}

// 添加配置常量
const API_CONFIG = {
  baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  model: 'deepseek-ai/DeepSeek-V2.5', // 选择您想使用的模型
  apiKey: process.env.NEXT_PUBLIC_SILICON_API_KEY || '', // 请确保在.env.local中设置此环境变量
  searchEndpoint: '/api/search' // 我们需要创建这个API端点
}

// 添加一个格式化消息的辅助函数
const formatAIMessage = (content: string) => {
  // 处理数字列表 (1. 2. 3. 等)
  const formattedContent = content.replace(/(\d+\.\s+)/g, '\n$1');
  
  // 处理bullet points
  const withBullets = formattedContent.replace(/•/g, '\n•');
  
  // 处理段落 (通过双换行分隔)
  const withParagraphs = withBullets.split('\n\n').join('\n\n');
  
  return withParagraphs;
};

// 添加角色配置
const ROLES_CONFIG = {
  captain: {
    name: '老船长',
    avatar: '👨‍✈️',
    style: 'bg-blue-100 text-blue-900'
  },
  crew: {
    name: '船员',
    avatar: '👨‍🔧',
    style: 'bg-gray-100 text-gray-900'
  },
  siren: {
    name: '海妖塞壬',
    avatar: '🧜‍♀️',
    style: 'bg-purple-100 text-purple-900'
  },
  passenger: {
    name: '乘客',
    avatar: '🧑',
    style: 'bg-green-100 text-green-900'
  },
  user: {
    name: '用户',
    avatar: 'U',
    style: 'bg-primary text-primary-foreground'
  },
  ai: {
    name: 'AI',
    avatar: 'AI',
    style: 'bg-muted'
  }
}

const ChatInterface = () => {
  // 添加状态管理
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: "LLM具体功能是什么",
      role: "ai"
    },
    {
      id: 2, 
      content: "能详细解释一下NLU的应用场景吗？",
      role: "user"
    },
    {
      id: 3,
      content: "NLU在现代技术中有广泛的应用场景：\n• 智能客服：自动理解客户询问，提供相关解答\n• 搜索引擎：理解用户搜索意图，返回相关结果\n• 语音助手：理解口头指令，执行相应操作\n• 情感分析：分析文本中的情感倾向和态度",
      role: "ai"
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isWebEnabled, setIsWebEnabled] = useState(false)
  
  // 取消未完成的请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // 修改发送消息处理函数
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now(),
      content: inputValue,
      role: 'user'
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()

    try {
      let finalPrompt = `
你是一个全知全能的AI，正观察着一艘正在沉没的游轮。请基于以下角色设定回应用户的输入：

老船长：经验丰富，坚信大家能获救，领导力强。
船员：胆小怕事，需要船长的鼓励。
海妖塞壬：邪恶狡诈，用美妙的歌声蛊惑人心。
乘客：普通人，恐慌且无助。

用户输入: "${inputValue}"

请依次用不同角色回应这个情况，每个角色的回应需要符合其性格特征。同时描述环境变化，并在对话中适当透露关键信息。
每个角色的回应请使用以下格式：

老船长: [回应内容]
船员: [回应内容]
海妖塞壬: [回应内容]
乘客: [回应内容]
`;
      
      // 如果启用了联网功能，先进行网络搜索
      if (isWebEnabled) {
        try {
          const searchResponse = await fetch(API_CONFIG.searchEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: inputValue }),
          });
          
          if (!searchResponse.ok) throw new Error('搜索请求失败');
          
          const searchResults: SearchResult[] = await searchResponse.json();
          
          // 将搜索结果整合到提示中
          finalPrompt = `
基于以下搜索结果回答问题: "${inputValue}"

搜索结果:
${searchResults.map(result => `
标题: ${result.title}
摘要: ${result.snippet}
链接: ${result.link}
`).join('\n')}

请根据以上搜索结果，提供一个全面的回答。
`;
        } catch (searchError) {
          console.error('搜索过程出错:', searchError);
          setMessages(prev => [...prev, {
            id: Date.now(),
            content: '搜索功能暂时不可用，将直接使用AI回答。',
            role: 'ai'
          }]);
        }
      }

      // 后续的 API 调用逻辑保持不变，但使用 finalPrompt
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
              role: 'user',
              content: finalPrompt
            }
          ],
          stream: true
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error('API请求失败')
      }

      // 创建一个新的AI消息
      const aiMessage: Message = {
        id: Date.now() + 1,
        content: '',
        role: 'ai'
      }
      setMessages(prev => [...prev, aiMessage])

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let accumulatedContent = '';
      
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6))
              const content = data.choices[0]?.delta?.content || ''
              accumulatedContent += content;
              
              // 当收到完整的角色回应时，创建新消息
              if (content.includes('\n')) {
                const responses = accumulatedContent.split('\n');
                for (const response of responses) {
                  const roleMatch = response.match(/^(老船长|船员|海妖塞壬|乘客):\s*(.+)/);
                  if (roleMatch) {
                    const [_, roleName, roleContent] = roleMatch;
                    const roleMap = {
                      '老船长': 'captain',
                      '船员': 'crew',
                      '海妖塞壬': 'siren',
                      '乘客': 'passenger'
                    } as const;
                    
                    setMessages(prev => [...prev, {
                      id: Date.now() + Math.random(),
                      content: roleContent.trim(),
                      role: roleMap[roleName as keyof typeof roleMap]
                    }]);
                  }
                }
                accumulatedContent = '';
              }
            } catch (e) {
              console.error('解析响应数据失败:', e)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('请求被取消')
      } else {
        console.error('发送消息失败:', error)
        // 添加错误提示消息
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          content: '抱歉，发送消息时出现错误。',
          role: 'ai'
        }])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto h-[600px] flex flex-col">
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role !== 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{ROLES_CONFIG[message.role].avatar}</AvatarFallback>
                </Avatar>
              )}
              <div className={`flex-1 ${message.role === 'user' ? 'max-w-[80%]' : ''}`}>
                {message.role !== 'user' && (
                  <div className="text-sm text-gray-500 mb-1">
                    {ROLES_CONFIG[message.role].name}
                  </div>
                )}
                <div 
                  className={`rounded-lg p-4 ${ROLES_CONFIG[message.role].style}`}
                >
                  <div className="whitespace-pre-wrap">
                    {formatAIMessage(message.content)}
                  </div>
                </div>
              </div>
              {message.role === 'user' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{ROLES_CONFIG.user.avatar}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2 items-center">
          <Button variant="outline" size="icon" type="button" disabled={isLoading}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='给"ChatGPT"发送消息'
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            variant="outline" 
            size="icon" 
            type="button" 
            disabled={isLoading}
            onClick={() => setIsWebEnabled(!isWebEnabled)}
            className={isWebEnabled ? 'bg-primary text-primary-foreground' : ''}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" type="button" disabled={isLoading}>
            <Mic className="h-4 w-4" />
          </Button>
          <Button type="submit" size="icon" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

export default ChatInterface

