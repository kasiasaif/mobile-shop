import { orderProgressStep, orderSteps } from '../lib/account'

export function OrderProgress({ status }: { status?: string }) {
  const current = orderSteps.findIndex((step) => step.id === orderProgressStep(status))

  return (
    <ol className="order-progress" aria-label="Order progress">
      {orderSteps.map((step, index) => {
        const state = index < current ? 'is-done' : index === current ? 'is-current' : ''
        return (
          <li key={step.id} className={state} aria-current={index === current ? 'step' : undefined}>
            <span>{index + 1}</span>
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}
