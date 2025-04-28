import { Button } from '@mui/material';
import { delay } from './utils/delay';

type Props = {
  inputId: string;
};
function TestButton({ inputId }: Props) {
  function fireOnChange(element) {
    const changeEvent = new Event('change');
    // set target (workaround to set readonly property)
    Object.defineProperty(changeEvent, 'target', {
      writable: false,
      value: element,
    });

    // trigger element.__reactProps$.onChange
    element[
      Object.keys(element).find((key) => key.match('reactProps'))!
    ].onChange(changeEvent);
  }

  async function sendInput(input: string) {
    const el = document.getElementById(inputId)! as HTMLInputElement;
    el.value += input;
    // Trigger the onChange event manually so React state updates
    fireOnChange(el);
  }

  function getRandomCharacter() {
    const minCodePoint = 97; // 'a'
    const maxCodePoint = 122; // 'z'
    const randomCodePoint =
      minCodePoint +
      Math.floor(Math.random() * (maxCodePoint - minCodePoint + 1));
    return String.fromCodePoint(randomCodePoint);
  }

  async function handleClick() {
    let count = 0;
    const element = document.getElementById(inputId);
    element?.click();

    while (count < 400) {
      await delay(20);
      await sendInput(getRandomCharacter());
      count++;
    }
  }

  return <Button onClick={handleClick}>Test (Sends 400 requests)</Button>;
}
export default TestButton;
