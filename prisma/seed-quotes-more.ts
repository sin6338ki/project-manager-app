import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const quotes = [
  { content: '소프트웨어는 먹는 것보다 빠르게 세상을 집어삼키고 있다.', author: 'Marc Andreessen' },
  { content: '어떤 바보라도 컴퓨터가 이해할 수 있는 코드를 작성할 수 있다. 좋은 프로그래머는 사람이 이해할 수 있는 코드를 작성한다.', author: 'Martin Fowler' },
  { content: '코드 한 줄을 삭제하는 것은 코드 한 줄을 추가하는 것보다 더 가치 있다.', author: 'Jeff Sickel' },
  { content: '가장 좋은 에러 메시지는 절대 나타나지 않는 것이다.', author: 'Thomas Fuchs' },
  { content: '프로그래밍은 생각하는 것이지, 타이핑하는 것이 아니다.', author: 'Casey Patton' },
  { content: '테스트 없이 코드를 작성하는 것은 눈을 감고 운전하는 것과 같다.', author: null },
  { content: '복잡함을 정복하는 유일한 방법은 추상화다.', author: 'Dijkstra' },
  { content: '성급한 최적화는 모든 악의 근원이다.', author: 'Donald Knuth' },
  { content: '주석이 필요한 코드는 이미 냄새가 난다.', author: 'Uncle Bob' },
  { content: '좋은 설계란 나쁜 설계보다 변경하기 쉬운 것이다.', author: 'Dave Thomas' },
  { content: '소프트웨어 개발에서 걷기와 씹기를 동시에 할 수 있는 사람은 드물다.', author: 'Gerald Weinberg' },
  { content: '디버깅은 처음부터 버그를 만들지 않는 것보다 두 배 더 어렵다.', author: 'Brian Kernighan' },
  { content: '모든 문제는 또 다른 간접 계층으로 해결할 수 있다.', author: 'David Wheeler' },
  { content: '코드는 거짓말을 하지 않는다. 주석은 가끔 거짓말을 한다.', author: 'Ron Jeffries' },
  { content: '프로그래밍은 마법이 아니다. 훈련된 기술이다.', author: null },
  { content: '반복하지 마라. DRY 원칙을 기억하라.', author: 'Andy Hunt' },
  { content: '좋은 아키텍처는 결정을 미루게 해준다.', author: 'Robert C. Martin' },
  { content: '간단한 것을 어렵게 만드는 것은 쉽다. 어려운 것을 간단하게 만드는 것이 어렵다.', author: 'Alan Kay' },
  { content: '버그를 고치기 전에, 먼저 그 버그를 재현하는 테스트를 작성하라.', author: null },
  { content: '코드 리뷰는 버그를 잡는 것이 아니라 지식을 공유하는 것이다.', author: null },
  { content: '레거시 코드란 테스트가 없는 코드다.', author: 'Michael Feathers' },
  { content: '기술 부채는 신용카드와 같다. 언젠가는 갚아야 한다.', author: 'Ward Cunningham' },
  { content: '최고의 코드는 작성하지 않은 코드다.', author: 'Jeff Atwood' },
  { content: '소프트웨어는 가스와 같다. 주어진 공간을 모두 채운다.', author: 'Nathan Myhrvold' },
  { content: '계획 없는 목표는 그저 소원일 뿐이다.', author: 'Antoine de Saint-Exupéry' },
  { content: '실패는 성공의 어머니다. 빠르게 실패하고 빠르게 배워라.', author: null },
  { content: '완료된 것이 완벽한 것보다 낫다.', author: 'Sheryl Sandberg' },
  { content: '작은 것을 크게 생각하지 말고, 큰 것을 작게 나눠라.', author: null },
  { content: '소프트웨어 개발은 팀 스포츠다.', author: null },
  { content: '처음부터 완벽하게 만들려 하지 마라. 먼저 동작하게 만들어라.', author: null },
  { content: '사용자가 원하는 것을 주지 말고, 필요한 것을 주어라.', author: 'Steve Jobs' },
  { content: '에러 핸들링은 나중에 추가하는 것이 아니라 처음부터 설계하는 것이다.', author: null },
  { content: '코드 품질은 WTF/분으로 측정된다.', author: 'Thom Holwerda' },
  { content: '프로그래머는 도구를 만드는 도구를 만든다.', author: null },
  { content: '리팩토링은 코드의 동작을 바꾸지 않고 구조를 바꾸는 것이다.', author: 'Martin Fowler' },
  { content: '어제의 최적화는 오늘의 레거시가 된다.', author: null },
  { content: '좋은 API는 사용하기 쉽고 오용하기 어렵다.', author: 'Josh Bloch' },
  { content: '문서화되지 않은 기능은 존재하지 않는 기능이다.', author: null },
  { content: '개발자의 가장 큰 적은 자기 자신의 과거 코드다.', author: null },
  { content: '배우는 것을 멈추면 성장도 멈춘다. 끊임없이 학습하라.', author: null },
]

async function main() {
  console.log('추가 명언 데이터 추가 중...')

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
