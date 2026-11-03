import { Button } from '@toss/tds-mobile';
import { Link } from 'react-router-dom';
import type { MutationError, Task } from '../domain';

export function MissingScreen() {
  return <main><h1>대상을 찾을 수 없어요</h1><p>삭제되었거나 잘못된 주소예요.</p><Link to="/">프로젝트 홈으로</Link></main>;
}

export function ConfirmDelete({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return <section role="alertdialog" aria-label="삭제 확인"><p>{message}</p><div className="actions"><Button color="danger" onClick={onConfirm}>삭제 확인</Button><Button variant="weak" onClick={onCancel}>취소</Button></div></section>;
}

export function mutationMessage(error: MutationError, tasks: Task[] = []): string {
  const names = (ids: string[]) => ids.map(id => tasks.find(t => t.id === id)?.name ?? id).join(' → ');
  switch (error.type) {
    case 'invalid_input': return Object.values(error.errors).map(code => ({ name_required: '이름을 입력해 주세요.', name_too_long: '이름은 50자 이하로 입력해 주세요.', duration_invalid: '예상 기간은 1~999 사이의 정수로 입력해 주세요.', start_date_invalid: '실제로 존재하는 시작일을 입력해 주세요.' }[code!])).join(' ');
    case 'cycle': return `순환 관계를 만들 수 없어요: ${names(error.cycle)}`;
    case 'waiting': return `먼저 완료해 주세요: ${names(error.waitingOnIds)}`;
    case 'self_reference': return '자기 자신을 선행 작업으로 지정할 수 없어요.';
    case 'invalid_predecessor': return '같은 프로젝트에 있는 작업만 선행 작업으로 지정해 주세요.';
    default: return '대상을 찾을 수 없어요. 프로젝트 홈에서 다시 확인해 주세요.';
  }
}
