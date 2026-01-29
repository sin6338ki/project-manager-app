import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const quotes = [
  { content: '좋은 코드는 그 자체로 최고의 문서다.', author: 'Steve McConnell' },
  { content: '먼저 동작하게 만들고, 그 다음에 빠르게 만들어라.', author: 'Kent Beck' },
  { content: '단순함은 궁극의 정교함이다.', author: 'Leonardo da Vinci' },
  { content: '코드는 사람이 읽기 위해 작성하는 것이다. 컴퓨터가 실행할 수 있는 것은 부수적인 효과일 뿐이다.', author: 'Harold Abelson' },
  { content: '완벽함이란 더 이상 추가할 것이 없을 때가 아니라, 더 이상 뺄 것이 없을 때 달성된다.', author: 'Antoine de Saint-Exupéry' },
  { content: '나쁜 프로그래머는 코드를 걱정한다. 좋은 프로그래머는 자료구조와 그 관계를 걱정한다.', author: 'Linus Torvalds' },
  { content: '프로그래밍에서 가장 어려운 것은 이름을 짓는 것이다.', author: 'Phil Karlton' },
  { content: '버그를 찾는 것은 처음부터 버그 없이 코드를 작성하는 것보다 두 배 더 어렵다.', author: 'Brian Kernighan' },
  { content: '오늘 한 줄의 코드가 내일의 백 줄을 줄인다.', author: null },
  { content: '작동하는 소프트웨어가 진척도를 측정하는 주요 척도다.', author: 'Agile Manifesto' },
]

async function main() {
  console.log('명언 데이터 추가 중...')

  for (const quote of quotes) {
    await prisma.quote.create({
      data: quote,
    })
  }

  console.log(`${quotes.length}개의 명언이 추가되었습니다.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
