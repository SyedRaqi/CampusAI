import type { ApplicationStatus, InternshipApplication } from '../../types'

const stages: ApplicationStatus[] = ['saved', 'applied', 'shortlisted', 'interview', 'offer', 'selected']

type ApplicationPipelineProps = { applications: InternshipApplication[] }

export default function ApplicationPipeline({ applications }: ApplicationPipelineProps) {
  return <div className="career-pipeline" aria-label="Application pipeline">{stages.map((stage, index) => <div className="career-pipeline-stage" key={stage}><strong>{applications.filter((application) => application.status === stage).length}</strong><span>{stage}</span>{index < stages.length - 1 && <i aria-hidden="true">›</i>}</div>)}</div>
}
