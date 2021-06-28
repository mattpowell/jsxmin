import { Button } from './ui'

document.body.innerHTML = <main id="container">
  Hello!
  <hr/>
  <Button>🌶🌶🌶</Button>
</main>;

document.body.addEventListener('click', () => {
  console.log('Hi.')
})
