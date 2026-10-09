/* oxlint-disable react/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react'
import type { ProjectTeamTask } from '../../types'
import { createTask, listTasks, updateTask } from '../../services/projectTeamService'

const columns = ['todo', 'in_progress', 'review', 'completed'] as const

export default function TaskBoard({ teamId, canManage }: { teamId: string; canManage: boolean }) {
  const [tasks, setTasks] = useState<ProjectTeamTask[]>([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setTasks(await listTasks(teamId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load tasks.')
    }
  }, [teamId])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return

    try {
      await createTask({
        team_id: teamId,
        title,
        description: '',
        assigned_to: null,
        priority: 'medium',
        status: 'todo',
        due_date: null,
      })
      setTitle('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add task.')
    }
  }

  return (
    <section className="task-board">
      <div className="community-section-heading">
        <div>
          <p className="eyebrow">Project work</p>
          <h2>Tasks</h2>
        </div>
        {canManage && (
          <form onSubmit={(event) => void add(event)} className="task-add">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task" />
            <button type="submit" className="community-button primary">Add</button>
          </form>
        )}
      </div>

      {error && <p className="community-error">{error}</p>}

      <div className="task-columns">
        {columns.map((column) => (
          <div className="task-column" key={column}>
            <header>
              <strong>{column.replace('_', ' ')}</strong>
              <span>{tasks.filter((task) => task.status === column).length}</span>
            </header>
            {tasks.filter((task) => task.status === column).map((task) => (
              <article className="task-card" key={task.id}>
                <strong>{task.title}</strong>
                <select
                  value={task.status}
                  onChange={(event) => {
                    void updateTask(task.id, { status: event.target.value }).then(() => void load())
                  }}
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
