import PageHeader from '../components/PageHeader'
import WorkItemCalendar from '../components/WorkItemCalendar'

export default function Scheduler() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Scheduler" />
      <div className="flex-1 min-h-0 p-6">
        <WorkItemCalendar />
      </div>
    </div>
  )
}
