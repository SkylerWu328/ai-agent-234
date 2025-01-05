import { useEffect, useState } from 'react'
import { Card } from './ui/card'
import { Avatar, AvatarFallback } from './ui/avatar'

type CommentatorAgentProps = {
  messages: {
    id: number
    content: string
    role: 'user' | 'ai' | 'captain' | 'crew' | 'siren'
  }[]
}

// 添加 API 响应类型定义
type ApiResponse = {
  choices: [{
    message: {
      content: string
    }
  }]
}

// 添加角色配置
const ROLES_CONFIG = {
  captain: {
    name: '老船长',
    avatar: '👨‍✈️',
    style: 'bg-blue-50',
    description: '经验丰富，坚信大家能获救，领导力强'
  },
  crew: {
    name: '船员',
    avatar: '👨‍🔧',
    style: 'bg-gray-50',
    description: '胆小怕事，需要船长的鼓励'
  },
  siren: {
    name: '海妖塞壬',
    avatar: '🧜‍♀️',
    style: 'bg-purple-50',
    description: '邪恶狡诈，用美妙的歌声蛊惑人心'
  },
  passenger: {
    name: '乘客',
    avatar: '🧑',
    style: 'bg-green-50',
    description: '普通人，恐慌且无助'
  }
}

const CommentatorAgent = ({ messages }: CommentatorAgentProps) => {
  const [agentResponses, setAgentResponses] = useState<{
    captain: string
    crew: string
    siren: string
    passenger: string
  } | null>(null)

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'ai') return

    // 构建角色提示
    const prompt = `
你是一个全知全能的AI，正观察着一艘正在沉没的游轮。请基于以下角色设定，对刚才的对话进行评论：

用户说: "${messages[messages.length - 2]?.content || ''}"
AI回答: "${lastMessage.content}"

请从以下角色的视角分别进行评论，每个角色的评论要以"角色名："开头：

老船长：经验丰富，坚信大家能获救，领导力强。
船员：胆小怕事，需要船长的鼓励。
海妖塞壬：邪恶狡诈，用美妙的歌声蛊惑人心。
乘客：普通人，恐慌且无助。

每个角色的评论要符合其性格特征，并且要对当前对话内容进行有意义的评论。
`
    // 发送评论请求
    fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SILICON_API_KEY}`
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    })
    .then(res => res.json())
    .then((data: ApiResponse) => {
      const content = data.choices[0].message.content
      const responses = {
        captain: '',
        crew: '',
        siren: '',
        passenger: ''
      }

      // 解析每个角色的回应
      content.split('\n').forEach((line: string) => {
        if (line.startsWith('老船长：')) responses.captain = line.slice(4)
        if (line.startsWith('船员：')) responses.crew = line.slice(3)
        if (line.startsWith('海妖塞壬：')) responses.siren = line.slice(5)
        if (line.startsWith('乘客：')) responses.passenger = line.slice(3)
      })

      setAgentResponses(responses)
    })
    .catch(console.error)
  }, [messages])

  if (!agentResponses) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500">角色评论：</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(ROLES_CONFIG).map(([key, role]) => (
          <Card key={key} className={`p-3 ${role.style}`}>
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{role.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">{role.name}</div>
                <div className="text-sm">
                  {agentResponses?.[key as keyof typeof agentResponses] || ''}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default CommentatorAgent 