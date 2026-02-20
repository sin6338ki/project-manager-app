import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const quotes = [
  { content: '소프트웨어를 만드는 유일한 방법은 팀이 함께 만드는 것이다.', author: 'Frederick Brooks' },
  { content: '코드를 삭제하는 것이 코드를 추가하는 것보다 더 어렵다.', author: 'Damian Conway' },
  { content: '프로그래밍은 생각하는 것에 대해 생각하는 것이다.', author: 'Leslie Lamport' },
  { content: '좋은 소프트웨어는 나쁜 하드웨어를 이길 수 없지만, 나쁜 소프트웨어는 좋은 하드웨어를 망칠 수 있다.', author: null },
  { content: '테스트를 작성하지 않은 코드는 설계부터 이미 망가진 것이다.', author: 'Michael Feathers' },
  { content: '프로그래머는 시인처럼 순수한 생각만으로 무언가를 만들어낸다.', author: 'Frederick Brooks' },
  { content: '복잡성은 신뢰성의 적이다.', author: 'Edsger Dijkstra' },
  { content: '모든 프로그램은 너무 작거나 너무 느리다.', author: 'C.A.R. Hoare' },
  { content: '디버깅은 프로그래밍보다 두 배 어렵다. 따라서 코드를 최대한 영리하게 작성한다면, 정의에 의해 당신은 그것을 디버그할 만큼 충분히 영리하지 않은 것이다.', author: 'Brian Kernighan' },
  { content: '먼저 해결책을 이해하라. 그러면 코드는 저절로 따라온다.', author: null },
  { content: '소프트웨어 개발은 복잡성을 관리하는 기술이다.', author: 'Grady Booch' },
  { content: '리팩토링은 기능을 추가하는 것이 아니라 코드를 이해하기 쉽게 만드는 것이다.', author: 'Martin Fowler' },
  { content: '일찍, 자주 실패하라. 그리고 그 실패로부터 배워라.', author: null },
  { content: '훌륭한 엔지니어는 문제를 해결하고, 탁월한 엔지니어는 문제가 생기기 전에 예방한다.', author: null },
  { content: '코드는 비용이 아니라 자산이다. 하지만 나쁜 코드는 부채다.', author: null },
  { content: '추상화는 당신이 집중할 수 있는 것과 무시할 수 있는 것을 선택하는 기술이다.', author: null },
  { content: '소프트웨어 아키텍처는 변경을 위한 비용을 최소화하는 것이다.', author: 'Robert C. Martin' },
  { content: '가장 빠른 코드는 실행되지 않는 코드다.', author: null },
  { content: '프로그래밍은 과학이 아니라 기술이다.', author: 'Donald Knuth' },
  { content: '코드 리뷰는 버그를 찾는 것이 아니라 지식을 공유하는 것이다.', author: null },
  { content: '의존성을 줄이는 것이 소프트웨어 설계의 핵심이다.', author: null },
  { content: '버전 관리 없는 코딩은 안전망 없이 줄타기를 하는 것과 같다.', author: null },
  { content: '문서화는 미래의 자신에게 보내는 편지다.', author: null },
  { content: '자동화할 수 있는 것은 자동화하라. 그것이 진짜 엔지니어링이다.', author: null },
  { content: '레거시 코드는 테스트가 없는 코드다.', author: 'Michael Feathers' },
  { content: '좋은 API는 설명이 필요 없지만, 나쁜 API는 어떤 설명으로도 이해할 수 없다.', author: null },
  { content: '단위 테스트는 명세서다. 코드가 무엇을 해야 하는지 보여준다.', author: null },
  { content: '배포는 기능 완성이 아니라 가치 전달이다.', author: null },
  { content: '소프트웨어는 절대 완성되지 않는다. 다만 출시될 뿐이다.', author: null },
  { content: '복사-붙여넣기는 설계 결함의 징후다.', author: null },
  { content: '좋은 이름은 주석보다 낫다.', author: 'Robert C. Martin' },
  { content: '프로그래밍 언어는 생각을 컴퓨터에 전달하는 수단이 아니라 다른 개발자에게 전달하는 수단이다.', author: 'Donald Knuth' },
  { content: '엔지니어링은 트레이드오프의 예술이다.', author: null },
  { content: '좋은 소프트웨어는 진화한다. 나쁜 소프트웨어는 그냥 변한다.', author: null },
  { content: '인터페이스는 구현보다 훨씬 더 오래 지속된다.', author: null },
  { content: '성능 최적화는 측정 없이는 추측일 뿐이다.', author: null },
  { content: '가장 좋은 코드는 아직 작성되지 않은 코드다.', author: null },
  { content: '소프트웨어 개발에서 유일한 상수는 변화다.', author: null },
  { content: 'CI/CD는 두려움 없이 배포할 수 있는 용기다.', author: null },
  { content: '컴퓨터 과학에서 모든 문제는 간접 참조 레이어를 추가하면 해결할 수 있다. 단, 레이어가 너무 많다는 문제를 제외하고.', author: 'David Wheeler' },
  { content: '협업은 혼자 할 수 없는 것을 함께 만드는 과정이다.', author: null },
  { content: '애자일은 방법론이 아니라 마음가짐이다.', author: null },
  { content: '기술 부채는 이자가 붙는다. 빨리 갚을수록 좋다.', author: null },
  { content: '오류 메시지는 사용자에게 보내는 편지다. 친절하게 써라.', author: null },
  { content: '견고한 소프트웨어는 예외적인 상황을 우아하게 처리한다.', author: null },
  { content: '확장성은 처음부터 설계하는 것이지, 나중에 추가하는 것이 아니다.', author: null },
  { content: '보안은 기능이 아니라 속성이다.', author: null },
  { content: '코드를 쓰는 시간보다 읽는 시간이 훨씬 많다. 읽기 쉽게 써라.', author: 'Robert C. Martin' },
  { content: '좋은 프레임워크는 좋은 결정을 쉽게 만들고 나쁜 결정을 어렵게 만든다.', author: null },
  { content: '데이터는 거짓말하지 않는다. 하지만 잘못 해석될 수 있다.', author: null },
  { content: '알고리즘은 문제 해결의 레시피다.', author: null },
  { content: '재사용 가능한 코드는 재사용 가능하도록 설계된 코드뿐이다.', author: null },
  { content: '모든 추상화는 새기 마련이다.', author: 'Joel Spolsky' },
  { content: '컴파일러는 거짓말하지 않는다.', author: null },
  { content: '좋은 개발자는 코드를 작성하기 전에 문제를 이해한다.', author: null },
  { content: '소프트웨어 개발의 90%는 의사소통이다.', author: null },
  { content: '최고의 도구는 손에 익은 도구다.', author: null },
  { content: 'DRY 원칙: 같은 것을 두 번 작성하지 마라.', author: 'Andy Hunt' },
  { content: '테스트 주도 개발은 테스트를 먼저 작성함으로써 더 나은 설계를 강제한다.', author: 'Kent Beck' },
  { content: '소프트웨어 위기는 하드웨어가 너무 빨리 발전했기 때문이다.', author: 'Edsger Dijkstra' },
  { content: '코드는 한 번 작성되지만 수십 번 읽힌다.', author: null },
  { content: '지속적 통합은 통합 지옥을 피하는 방법이다.', author: null },
  { content: '마이크로서비스는 복잡성을 없애지 않고 분산시킬 뿐이다.', author: null },
  { content: '함수는 한 가지 일만 해야 하고, 그 일을 잘 해야 한다.', author: 'Robert C. Martin' },
  { content: '상속보다 컴포지션을 선호하라.', author: 'Gang of Four' },
  { content: '의존성 주입은 하드코딩된 의존성을 제거하는 패턴이다.', author: null },
  { content: '변경에는 열려 있고 수정에는 닫혀 있어야 한다.', author: 'Bertrand Meyer' },
  { content: '인터페이스를 통해 프로그래밍하라. 구현을 통해서가 아니라.', author: 'Gang of Four' },
  { content: '느슨한 결합과 높은 응집도는 좋은 설계의 두 축이다.', author: null },
  { content: '모든 소프트웨어는 처음에는 프로토타입이다.', author: null },
  { content: '예외는 예외적인 상황에만 사용해야 한다.', author: null },
  { content: '불변성은 병렬 프로그래밍의 친구다.', author: null },
  { content: '멱등성이 보장된 API는 안전하게 재시도할 수 있다.', author: null },
  { content: '로그는 미래의 자신에게 남기는 단서다.', author: null },
  { content: '모니터링 없는 운영은 눈 감고 운전하는 것과 같다.', author: null },
  { content: '도메인 주도 설계는 복잡한 비즈니스 로직을 코드에 녹이는 방법이다.', author: 'Eric Evans' },
  { content: '명세가 없으면 모든 코드는 정의에 의해 올바르다.', author: null },
  { content: '스택 오버플로는 재귀의 나쁜 끝이다.', author: null },
  { content: '타입 시스템은 컴파일 타임에 버그를 잡는 가장 저렴한 방법이다.', author: null },
  { content: '함수형 프로그래밍은 부작용을 격리하는 방법이다.', author: null },
  { content: '비동기 프로그래밍은 기다리는 동안 다른 일을 하는 기술이다.', author: null },
  { content: '캐시는 느린 것을 빠르게 만드는 마법이지만, 무효화는 악마다.', author: null },
  { content: '데이터베이스 인덱스는 읽기를 빠르게 하지만 쓰기를 느리게 한다.', author: null },
  { content: '정규화는 중복을 제거하지만, 때로는 비정규화가 성능을 위해 필요하다.', author: null },
  { content: 'REST는 설계 철학이지 표준이 아니다.', author: 'Roy Fielding' },
  { content: '좋은 커밋 메시지는 코드가 무엇을 하는지가 아니라 왜 하는지를 설명한다.', author: null },
  { content: '브랜치 전략은 팀의 협업 방식을 반영한다.', author: null },
  { content: '코드 포맷은 취향이 아니라 팀의 규약이다.', author: null },
  { content: '정적 분석 도구는 잠들지 않는 코드 리뷰어다.', author: null },
  { content: '컨테이너는 환경 차이라는 "내 컴퓨터에서는 됩니다" 문제를 해결한다.', author: null },
  { content: '인프라도 코드다. 버전을 관리하고 테스트하라.', author: null },
  { content: '클라우드는 다른 사람의 컴퓨터일 뿐이다.', author: null },
  { content: '12팩터 앱은 현대적인 웹 애플리케이션의 모범 사례다.', author: null },
  { content: '작은 커밋이 큰 커밋보다 이해하기 쉽고 되돌리기도 쉽다.', author: null },
  { content: '오픈 소스 기여는 배움과 나눔의 순환이다.', author: null },
  { content: '코드는 팀의 공동 자산이다. 개인 소유가 아니다.', author: null },
  { content: '기술은 수단이지 목적이 아니다. 문제 해결이 목적이다.', author: null },
]

async function main() {
  console.log('개발 명언 100개 추가 중...')

  let added = 0
  for (const quote of quotes) {
    await prisma.quote.create({ data: quote })
    added++
  }

  console.log(`${added}개의 명언이 추가되었습니다.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
