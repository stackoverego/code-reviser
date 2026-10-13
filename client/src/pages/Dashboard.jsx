import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { gsap } from 'gsap';
import { AuthContext } from '../context/AuthContext';
import Icon from '../components/Icon';

const intervals = [
  { label: '1 day', value: '1' },
  { label: '3 days', value: '3' },
  { label: '7 days', value: '7' },
  { label: '15 days', value: '15' },
  { label: '21 days', value: '21' },
  { label: '30 seconds · test', value: '0.0003472222' },
];

const Dashboard = () => {
  const { apiFetch, user } = useContext(AuthContext);
  const dashboardRef = useRef(null);
  const animatedReminderIds = useRef(new Set());
  const notifiedRemindersRef = useRef(new Set());
  const requestedSuggestionsRef = useRef(new Set());

  const [reminders, setReminders] = useState([]);
  const [practiceSuggestions, setPracticeSuggestions] = useState({});
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [questionTitle, setQuestionTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [notes, setNotes] = useState('');
  const [intervalDays, setIntervalDays] = useState('1');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const fetchReminders = useCallback(async () => {
    try {
      const res = await apiFetch('/reminders');
      if (!res.ok) {
        throw new Error('Could not load your reminders. Please refresh to try again.');
      }
      const data = await res.json();
      setReminders(data);
    } catch (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      setActionError(fetchError.message || 'Could not load your reminders.');
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchReminders();
    const pollInterval = setInterval(fetchReminders, 15000);
    return () => clearInterval(pollInterval);
  }, [fetchReminders]);

  useEffect(() => {
    const clockInterval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const introItems = gsap.utils.toArray('[data-intro]');
      gsap.fromTo(
        introItems,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08, ease: 'power3.out', clearProps: 'all' }
      );
    }, dashboardRef);
    return () => context.revert();
  }, []);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const freshCards = Array.from(
      dashboardRef.current?.querySelectorAll('[data-reminder-id]') || []
    ).filter((card) => !animatedReminderIds.current.has(card.dataset.reminderId));

    if (freshCards.length) {
      freshCards.forEach((card) => animatedReminderIds.current.add(card.dataset.reminderId));
      gsap.fromTo(
        freshCards,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power2.out', clearProps: 'all' }
      );
    }
  }, [reminders]);

  const handleUrlChange = (event) => {
    const url = event.target.value;
    setLeetcodeUrl(url);
    const match = url.match(/problems\/([a-zA-Z0-9-]+)/);
    if (match?.[1]) {
      const title = match[1]
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setQuestionTitle(title);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
  };

  const showDesktopNotification = useCallback((title, body, url) => {
    if (notifPermission !== 'granted' || !('Notification' in window)) return;
    const notification = new Notification(title, { body });
    notification.onclick = () => window.open(url, '_blank', 'noopener,noreferrer');
  }, [notifPermission]);

  const requestPracticeSuggestion = useCallback(async (id) => {
    if (requestedSuggestionsRef.current.has(id)) return;
    requestedSuggestionsRef.current.add(id);
    setPracticeSuggestions((current) => ({ ...current, [id]: { loading: true } }));

    try {
      const res = await apiFetch(`/reminders/${id}/practice-suggestion`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load a practice suggestion.');
      setPracticeSuggestions((current) => ({
        ...current,
        [id]: { suggestion: data.suggestion },
      }));
    } catch (suggestionError) {
      setPracticeSuggestions((current) => ({
        ...current,
        [id]: { error: suggestionError.message || 'Could not load a practice suggestion.' },
      }));
    }
  }, [apiFetch]);

  const retryPracticeSuggestion = (id) => {
    requestedSuggestionsRef.current.delete(id);
    requestPracticeSuggestion(id);
  };

  useEffect(() => {
    reminders.forEach((reminder) => {
      const isDue = reminder.status !== 'completed' && new Date(reminder.dueAt).getTime() <= now;
      if (isDue && !requestedSuggestionsRef.current.has(reminder._id)) {
        requestPracticeSuggestion(reminder._id);
      }

      if (
        reminder.status === 'pending' &&
        isDue &&
        !notifiedRemindersRef.current.has(reminder._id)
      ) {
        notifiedRemindersRef.current.add(reminder._id);
        showDesktopNotification(
          `Time to review: ${reminder.questionTitle}`,
          'Your scheduled review is due. Open the question and give it another try.',
          reminder.leetcodeUrl
        );
      }
    });
  }, [reminders, now, requestPracticeSuggestion, showDesktopNotification]);

  const handleAddReminder = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!leetcodeUrl || !questionTitle) {
      setError('Add a LeetCode link and question title to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/reminders', {
        method: 'POST',
        body: JSON.stringify({
          leetcodeUrl,
          questionTitle,
          difficulty,
          notes,
          intervalDays: parseFloat(intervalDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not create your reminder.');

      setSuccess('Question added to your review plan.');
      setLeetcodeUrl('');
      setQuestionTitle('');
      setNotes('');
      setDifficulty('Medium');
      setIntervalDays('1');
      await fetchReminders();
    } catch (submitError) {
      setError(submitError.message || 'Could not save your question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateReminder = async (id, body, failureMessage) => {
    setActionError('');
    try {
      const res = await apiFetch(`/reminders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || failureMessage);
      }
      notifiedRemindersRef.current.delete(id);
      if (body.reschedule) requestedSuggestionsRef.current.delete(id);
      await fetchReminders();
    } catch (updateError) {
      setActionError(updateError.message || failureMessage);
    }
  };

  const handleCompleteReminder = (id) => {
    updateReminder(id, { status: 'completed' }, 'Could not mark this question as solved.');
  };

  const handleReschedule = (id, days) => {
    updateReminder(
      id,
      { reschedule: true, intervalDays: parseFloat(days) },
      'Could not reschedule this question.'
    );
  };

  const handleDeleteReminder = async (id) => {
    setActionError('');
    try {
      const res = await apiFetch(`/reminders/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Could not delete this reminder.');
      }
      await fetchReminders();
    } catch (deleteError) {
      setActionError(deleteError.message || 'Could not delete this reminder.');
    }
  };

  const getCountdownString = (dueAt) => {
    const diff = new Date(dueAt).getTime() - now;
    if (diff <= 0) return { text: 'Due for review', isDue: true };

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const text = days > 0
      ? `${days}d ${hours}h remaining`
      : hours > 0
        ? `${hours}h ${minutes}m remaining`
        : `${minutes}m ${seconds}s remaining`;
    return { text, isDue: false };
  };

  const renderPracticeSuggestion = (reminder) => {
    if (
      reminder.status === 'completed' ||
      new Date(reminder.dueAt).getTime() > now
    ) return null;

    const state = practiceSuggestions[reminder._id];
    return (
      <section className="practice-suggestion" aria-label="Related practice suggestion">
        <div className="suggestion-heading">
          <span className="suggestion-icon"><Icon name="sparkles" size={17} /></span>
          <span>AI-picked practice</span>
          {state?.loading && <span className="suggestion-loading">Finding a match</span>}
        </div>
        {state?.loading && <div className="suggestion-skeleton" aria-hidden="true" />}
        {state?.error && (
          <div className="suggestion-error">
            <p>{state.error}</p>
            <button type="button" className="text-button" onClick={() => retryPracticeSuggestion(reminder._id)}>
              Try again <Icon name="arrow" size={14} />
            </button>
          </div>
        )}
        {state?.suggestion && (
          <>
            <a
              className="suggestion-title"
              href={state.suggestion.leetcodeUrl}
              target="_blank"
              rel="noreferrer"
            >
              {state.suggestion.title}
              <Icon name="arrow" size={16} />
            </a>
            <div className="suggestion-meta">
              <span className={`diff-badge ${state.suggestion.difficulty.toLowerCase()}-badge`}>
                {state.suggestion.difficulty}
              </span>
              <p>{state.suggestion.whyRelated}</p>
            </div>
          </>
        )}
      </section>
    );
  };

  const pendingReminders = reminders.filter((reminder) => reminder.status === 'pending');
  const completedReminders = reminders.filter((reminder) => reminder.status !== 'pending');
  const dueCount = pendingReminders.filter((reminder) => new Date(reminder.dueAt).getTime() <= now).length;
  const completionRate = reminders.length
    ? Math.round((completedReminders.length / reminders.length) * 100)
    : 0;
  const displayName = user?.username || user?.email?.split('@')[0] || 'there';

  return (
    <main className="dashboard-wrapper" ref={dashboardRef}>
      <header className="dashboard-hero" id="overview">
        <div className="hero-copy" data-intro>
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL STUDY SPACE</div>
          <h1>One more rep.<br /><span>One step closer.</span></h1>
          <p>Welcome back, {displayName}. Keep your problem-solving skills sharp with a review routine that sticks.</p>
          <a href="#add-question" className="hero-cta">
            <Icon name="plus" size={18} /> Add a question
          </a>
        </div>
        <div className="hero-art" data-intro aria-hidden="true">
          <div className="hero-art-orbit orbit-one" />
          <div className="hero-art-orbit orbit-two" />
          <div className="hero-code-card">
            <div className="code-window-top"><i /><i /><i /><span>daily-practice.js</span></div>
            <div className="code-lines">
              <span><b>01</b> <em>const</em> mindset = <strong>"consistent"</strong>;</span>
              <span><b>02</b> <em>while</em> (learning) {'{'}</span>
              <span><b>03</b> &nbsp; practice.<strong>repeat</strong>();</span>
              <span><b>04</b> {'}'}</span>
            </div>
            <div className="code-status"><span /> KEEP YOUR STREAK ALIVE</div>
          </div>
          <div className="hero-float-chip"><Icon name="target" size={17} /> Focus on progress</div>
        </div>
      </header>

      {notifPermission === 'default' && (
        <div className="notification-prompt" data-intro>
          <span className="notification-icon"><Icon name="bell" size={19} /></span>
          <div className="notification-copy">
            <strong>Never miss a review</strong>
            <span>Turn on desktop notifications for a gentle nudge when a question is due.</span>
          </div>
          <button type="button" className="notification-button" onClick={requestNotificationPermission}>
            Enable notifications <Icon name="arrow" size={15} />
          </button>
        </div>
      )}

      <section className="stats-grid" aria-label="Study overview">
        <article className="stat-card" data-intro>
          <div className="stat-card-top"><span className="stat-icon stat-icon-purple"><Icon name="book" /></span><span className="stat-kicker">YOUR LIBRARY</span></div>
          <div className="stat-value">{reminders.length}</div>
          <div className="stat-caption">Questions tracked</div>
          <div className="stat-footnote">Every problem is progress.</div>
        </article>
        <article className="stat-card stat-card-due" data-intro>
          <div className="stat-card-top"><span className="stat-icon stat-icon-amber"><Icon name="clock" /></span><span className="stat-kicker">UP NEXT</span></div>
          <div className="stat-value">{dueCount}</div>
          <div className="stat-caption">{dueCount === 1 ? 'Review due now' : 'Reviews due now'}</div>
          <div className="stat-footnote">{pendingReminders.length} in your review queue</div>
        </article>
        <article className="stat-card" data-intro>
          <div className="stat-card-top"><span className="stat-icon stat-icon-green"><Icon name="target" /></span><span className="stat-kicker">COMPLETION</span></div>
          <div className="stat-value">{completionRate}<span className="stat-unit">%</span></div>
          <div className="stat-caption">Questions reviewed</div>
          <div className="stat-progress"><span style={{ width: `${completionRate}%` }} /></div>
        </article>
      </section>

      <div className="workspace-heading" data-intro>
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h2>Make today count<span className="heading-period">.</span></h2>
        </div>
        <div className="today-label"><span className="today-indicator" /> {new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      </div>

      {actionError && (
        <div className="inline-alert inline-alert-error" role="alert">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error">×</button>
        </div>
      )}

      <div className="dashboard-grid">
        <aside className="form-panel" id="add-question" data-intro>
          <div className="form-panel-heading">
            <span className="form-heading-icon"><Icon name="plus" size={21} /></span>
            <div>
              <span className="panel-overline">GROW YOUR LIBRARY</span>
              <h2>Add a question</h2>
            </div>
          </div>
          <p className="form-description">Save a problem now. Your future self will thank you.</p>

          {error && (
            <div className="inline-alert inline-alert-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
            </div>
          )}
          {success && <div className="inline-alert inline-alert-success" role="status">{success}</div>}

          <form onSubmit={handleAddReminder}>
            <div className="form-group">
              <label className="form-label" htmlFor="question-url">LeetCode URL</label>
              <div className="input-with-icon">
                <Icon name="code" size={18} />
                <input
                  id="question-url"
                  type="url"
                  className="form-input"
                  placeholder="leetcode.com/problems/..."
                  value={leetcodeUrl}
                  onChange={handleUrlChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="question-title">Question name</label>
              <input
                id="question-title"
                type="text"
                className="form-input"
                placeholder="e.g. Two Sum"
                value={questionTitle}
                onChange={(event) => setQuestionTitle(event.target.value)}
                required
              />
            </div>

            <fieldset className="form-group difficulty-fieldset">
              <legend className="form-label">Difficulty</legend>
              <div className="radio-group">
                {['Easy', 'Medium', 'Hard'].map((level) => (
                  <label key={level} className="radio-btn">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={difficulty === level}
                      onChange={() => setDifficulty(level)}
                    />
                    <span className={`radio-label ${level.toLowerCase()}`}>{level}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="form-group">
              <label className="form-label" htmlFor="review-interval">Remind me in</label>
              <div className="select-wrap">
                <select
                  id="review-interval"
                  className="form-select"
                  value={intervalDays}
                  onChange={(event) => setIntervalDays(event.target.value)}
                >
                  {intervals.map((interval) => (
                    <option key={interval.value} value={interval.value}>{interval.label}</option>
                  ))}
                </select>
                <Icon name="chevron" size={17} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="question-notes">Notes <span className="optional-label">OPTIONAL</span></label>
              <textarea
                id="question-notes"
                className="form-input form-textarea"
                placeholder="What would you like to remember about this one?"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows="3"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              <Icon name="plus" size={18} />
              {isSubmitting ? 'Adding question…' : 'Add to review plan'}
              {!isSubmitting && <Icon name="arrow" size={16} />}
            </button>
          </form>
          <div className="form-reassurance"><Icon name="check" size={15} /> Your progress is saved to your account</div>
        </aside>

        <section className="review-column" id="questions" aria-label="Your questions">
          <div className="list-section-header" data-intro>
            <div className="list-heading-copy">
              <span className="section-icon"><Icon name="clock" size={19} /></span>
              <div><h2>Review queue</h2><p>A little practice goes a long way.</p></div>
            </div>
            <span className="badge-count">{pendingReminders.length} <span>ACTIVE</span></span>
          </div>

          <div className="reminders-list">
            {pendingReminders.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="target" size={25} /></span>
                <h3>Your next win starts here</h3>
                <p>Add a question to your review plan and build a habit one session at a time.</p>
                <a href="#add-question" className="text-button">Add your first question <Icon name="arrow" size={15} /></a>
              </div>
            ) : (
              pendingReminders.map((reminder) => {
                const countdown = getCountdownString(reminder.dueAt);
                return (
                  <article
                    key={reminder._id}
                    data-reminder-id={reminder._id}
                    className={`reminder-card ${reminder.difficulty.toLowerCase()}-card`}
                  >
                    <div className="reminder-card-main">
                      <div className="reminder-card-topline">
                        <span className="question-label"><Icon name="code" size={14} /> LEETCODE QUESTION</span>
                        <span className={`diff-badge ${reminder.difficulty.toLowerCase()}-badge`}>{reminder.difficulty}</span>
                      </div>
                      <a href={reminder.leetcodeUrl} target="_blank" rel="noreferrer" className="card-title">
                        {reminder.questionTitle}<Icon name="arrow" size={17} />
                      </a>
                      {reminder.notes && <p className="card-notes">{reminder.notes}</p>}
                      {renderPracticeSuggestion(reminder)}
                    </div>
                    <div className="card-side">
                      <span className={`countdown-timer ${countdown.isDue ? 'due' : ''}`}>
                        <Icon name="clock" size={15} /> {countdown.text}
                      </span>
                      <div className="action-row">
                        <button
                          type="button"
                          onClick={() => handleCompleteReminder(reminder._id)}
                          className="btn-solved"
                          title="Mark as solved"
                        >
                          <Icon name="check" size={16} /> Solved
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReminder(reminder._id)}
                          className="btn-delete"
                          title="Delete reminder"
                          aria-label={`Delete ${reminder.questionTitle}`}
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="list-section-header archive-header" data-intro>
            <div className="list-heading-copy">
              <span className="section-icon section-icon-muted"><Icon name="archive" size={18} /></span>
              <div><h2>Past reviews</h2><p>Every solved question is a step forward.</p></div>
            </div>
            <span className="badge-count">{completedReminders.length} <span>SAVED</span></span>
          </div>

          <div className="reminders-list archive-list">
            {completedReminders.length === 0 ? (
              <div className="archive-empty">Solved questions will live here. Your progress starts with the first review.</div>
            ) : (
              completedReminders.map((reminder) => (
                <article key={reminder._id} data-reminder-id={reminder._id} className="reminder-card archive-card">
                  <div className="reminder-card-main">
                    <div className="reminder-card-topline">
                      <span className="question-label"><Icon name="book" size={14} /> PAST REVIEW</span>
                      <span className={`diff-badge ${reminder.difficulty.toLowerCase()}-badge`}>{reminder.difficulty}</span>
                    </div>
                    <a href={reminder.leetcodeUrl} target="_blank" rel="noreferrer" className="card-title">
                      {reminder.questionTitle}<Icon name="arrow" size={16} />
                    </a>
                    <p className="archive-status">
                      <span className={`status-dot ${reminder.status === 'completed' ? 'status-solved' : 'status-notified'}`} />
                      {reminder.status === 'completed' ? 'Solved' : 'Review reminder sent'}
                    </p>
                    {renderPracticeSuggestion(reminder)}
                  </div>
                  <div className="card-side archive-actions">
                    <label className="sr-only" htmlFor={`reschedule-${reminder._id}`}>Reschedule {reminder.questionTitle}</label>
                    <div className="select-wrap reschedule-wrap">
                      <select
                        id={`reschedule-${reminder._id}`}
                        className="form-select"
                        defaultValue=""
                        onChange={(event) => {
                          if (event.target.value) {
                            handleReschedule(reminder._id, event.target.value);
                            event.target.value = '';
                          }
                        }}
                      >
                        <option value="" disabled>Reschedule</option>
                        {intervals.map((interval) => (
                          <option key={interval.value} value={interval.value}>{interval.label}</option>
                        ))}
                      </select>
                      <Icon name="chevron" size={15} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminder(reminder._id)}
                      className="btn-delete"
                      title="Delete permanently"
                      aria-label={`Delete ${reminder.questionTitle} permanently`}
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <footer className="dashboard-footer">
        <span><Icon name="sparkles" size={15} /> Small steps. Strong solutions.</span>
        <span>Made for the long game.</span>
      </footer>
    </main>
  );
};

export default Dashboard;
