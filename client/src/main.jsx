import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const sections = [
  ['picture', 'Picture story', 600],
  ['situation', 'Situation response', 900],
  ['word', 'Word association', 900],
  ['choice', 'Behavioral choices', 900]
];

const names = {
  decisionMaking: 'Decision Making',
  problemSolving: 'Problem Solving',
  leadership: 'Leadership',
  teamwork: 'Teamwork',
  communication: 'Communication',
  adaptability: 'Adaptability',
  responsibility: 'Responsibility',
  emotionalRegulation: 'Emotional Regulation',
  initiative: 'Initiative',
  ethicalJudgment: 'Ethical Judgment'
};

const token = () => localStorage.getItem('pxToken');

async function api(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token()) headers.set('Authorization', 'Bearer ' + token());
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw Error('Cannot reach the PersonaX API. Ensure backend is running with: npm start');
  }
  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    throw Error('The PersonaX API returned an unexpected response.');
  }
  if (!response.ok) throw Error(data.error || 'Request failed (' + response.status + ')');
  return data;
}

function go(path) {
  location.href = path;
}

function useHash() {
  const [hash, setHash] = useState(() => (location.hash ? location.hash.slice(1) : ''));
  useEffect(() => {
    const onHashChange = () => setHash(location.hash ? location.hash.slice(1) : '');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const navigateHash = (newHash) => {
    location.hash = newHash;
    setHash(newHash);
  };
  return [hash, navigateHash];
}

function Header() {
  const role = localStorage.getItem('pxRole');
  const [hash] = useHash();
  return (
    <header className="top">
      <a className="brand" href="/">PERSONA<span>X</span></a>
      {role && <TabNav role={role} active={hash} />}
      {token() && (
        <button className="secondary" onClick={() => { localStorage.clear(); go('/'); }}>
          Sign out
        </button>
      )}
    </header>
  );
}

function TabNav({ role, active }) {
  const tabs = role === 'candidate'
    ? [['dashboard', 'Dashboard'], ['dashboard#history', 'Test History & Responses'], ['instructions', 'Start Test'], ['dashboard#profile', 'Profile']]
    : [['reviewer', 'Review Candidates'], ['reviewer#evaluated', 'Evaluated Tests'], ['reviewer#summary', 'Competency Summary']];

  return (
    <nav className="tab-nav" aria-label="Main navigation">
      {tabs.map(([path, label]) => {
        const hash = path.includes('#') ? path.split('#')[1] : '';
        const isCurrent = hash ? active === hash : (!active || active === 'dashboard' || active === 'reviewer' || active === 'candidates');
        return (
          <a className={isCurrent ? 'active' : ''} href={'/' + path} key={path}>
            {label}
          </a>
        );
      })}
    </nav>
  );
}

function Auth() {
  const [register, setRegister] = useState(false);
  const [loginRole, setLoginRole] = useState('candidate');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = Object.fromEntries(new FormData(e.currentTarget));
    body.role = register ? 'candidate' : loginRole;
    try {
      const d = await api('/api/auth/' + (register ? 'register' : 'login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      localStorage.setItem('pxToken', d.token);
      localStorage.setItem('pxRole', d.user.role);
      localStorage.setItem('pxUser', JSON.stringify(d.user));
      if (d.user.candidateId) localStorage.setItem('pxCandidate', d.user.candidateId);
      if (d.assessmentId) localStorage.setItem('pxAssessment', d.assessmentId);
      go(d.user.role === 'evaluator' ? '/reviewer' : '/dashboard');
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="hero">
        <section>
          <p className="eyebrow">HUMAN BEHAVIORAL ASSESSMENT</p>
          <h1>See how you respond<br />when it matters.</h1>
          <p className="lead">Candidates complete timed assessment sections. Evaluators review responses section by section and record ratings with context.</p>
          <div className="badges">
            <span>4 timed sections</span>
            <span>Candidate and evaluator accounts</span>
            <span>MongoDB-backed</span>
          </div>
        </section>
        <form className="card" onSubmit={submit}>
          <h2>{register ? 'Candidate sign up' : loginRole === 'evaluator' && !register ? 'Evaluator sign in' : 'Candidate sign in'}</h2>
          {!register && (
            <div className="account-type-tabs" role="group" aria-label="Sign in type">
              <button type="button" className={loginRole === 'candidate' ? 'active' : ''} onClick={() => { setLoginRole('candidate'); setError(''); }}>Candidate</button>
              <button type="button" className={loginRole === 'evaluator' ? 'active' : ''} onClick={() => { setLoginRole('evaluator'); setError(''); }}>Evaluator</button>
            </div>
          )}
          {register && <label>Your name<input name="name" required maxLength="80" placeholder="Enter your name" /></label>}
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" required minLength="8" autoComplete={register ? 'new-password' : 'current-password'} placeholder="At least 8 characters" /></label>
          <button className="primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
          <p className="error" role="alert">{error}</p>
          <p><small>{register ? 'Already have an account?' : 'New to PersonaX?'} <a href="#" onClick={e => { e.preventDefault(); setRegister(!register); setError(''); }}>{register ? 'Sign in' : 'Create a candidate account'}</a></small></p>
          <small>This educational tool does not provide medical or psychological diagnoses.</small>
        </form>
      </main>
    </>
  );
}

function Guard({ role, children }) {
  if (!token() || localStorage.getItem('pxRole') !== role) {
    go('/');
    return null;
  }
  return children;
}

/* Candidate Previous Test Responses Component */
function CandidateHistory() {
  const [attempts, setAttempts] = useState([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState('');
  const [responses, setResponses] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [error, setError] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [filterAnswered, setFilterAnswered] = useState('all');

  useEffect(() => {
    setLoadingAttempts(true);
    api('/api/assessments/my/attempts')
      .then(data => {
        setAttempts(data);
        if (data.length > 0) {
          const best = data.find(a => a.isEvaluated && a.responseCount > 0) ||
                       data.find(a => a.responseCount > 0) ||
                       data.find(a => a.status === 'completed') ||
                       data[0];
          setSelectedAttemptId(best._id);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingAttempts(false));
  }, []);

  useEffect(() => {
    if (!selectedAttemptId) return;
    setLoadingResponses(true);
    setError('');
    api(`/api/assessments/${selectedAttemptId}/responses`)
      .then(setResponses)
      .catch(e => setError(e.message))
      .finally(() => setLoadingResponses(false));
  }, [selectedAttemptId]);

  if (loadingAttempts) {
    return <div className="card" style={{ padding: '40px', textAlign: 'center' }}>Loading your previous assessment attempts…</div>;
  }

  if (attempts.length === 0) {
    return (
      <div className="card empty-state">
        <p className="eyebrow">NO PREVIOUS TESTS</p>
        <h3>No Assessment Responses Found</h3>
        <p>You have not completed any tests yet. Once you take and submit an assessment, your full responses of what you wrote and opted will be preserved here.</p>
        <a className="primary button" href="/instructions">Start Your Assessment</a>
      </div>
    );
  }

  const currentAttempt = attempts.find(a => a._id === selectedAttemptId) || attempts[0];
  const filteredResponses = responses.filter(r => {
    const sec = r.questionId?.section;
    if (filterSection !== 'all' && sec !== filterSection) return false;
    if (filterAnswered === 'answered' && !r.answered) return false;
    if (filterAnswered === 'skipped' && !r.skipped) return false;
    return true;
  });

  const sectionCounts = {
    all: responses.length,
    picture: responses.filter(r => r.questionId?.section === 'picture').length,
    situation: responses.filter(r => r.questionId?.section === 'situation').length,
    word: responses.filter(r => r.questionId?.section === 'word').length,
    choice: responses.filter(r => r.questionId?.section === 'choice').length
  };

  return (
    <div className="candidate-history-container">
      <div className="attempt-selector-bar">
        <div>
          <label>
            Select Assessment Test:
            <select value={selectedAttemptId} onChange={e => setSelectedAttemptId(e.target.value)}>
              {attempts.map((a, i) => (
                <option key={a._id} value={a._id}>
                  Test Attempt {attempts.length - i} · {new Date(a.createdAt || a.startedAt).toLocaleDateString()} ({a.status}) {a.isEvaluated ? '· ✓ Evaluated' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {currentAttempt?.isEvaluated ? (
            <span className="badge badge-evaluated">✓ Evaluated by Evaluator ({currentAttempt.evaluationsCount} sections)</span>
          ) : (
            <span className="badge badge-pending">Pending Evaluator Rating</span>
          )}
          <span className="badge badge-info">{currentAttempt?.status}</span>
        </div>
      </div>

      {currentAttempt && (
        <div className="attempt-summary-card">
          <div className="attempt-summary-header">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>TEST RESPONSES OVERVIEW</p>
              <h2>Your Test Submission</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <small className="fine">Taken on {new Date(currentAttempt.createdAt || currentAttempt.startedAt).toLocaleString()}</small>
            </div>
          </div>
          <div className="stats">
            <div>
              <b>{currentAttempt.responseCount || responses.length}</b>
              <small>Total Questions</small>
            </div>
            <div>
              <b>{responses.filter(r => r.answered).length}</b>
              <small>Answered</small>
            </div>
            <div>
              <b>{responses.filter(r => r.skipped).length}</b>
              <small>Skipped</small>
            </div>
            <div>
              <b>{currentAttempt.isEvaluated ? 'Evaluated' : 'Submitted'}</b>
              <small>Evaluation Status</small>
            </div>
          </div>
        </div>
      )}

      {/* Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div className="pill-group" style={{ margin: '8px 0' }}>
          <button className={'pill ' + (filterSection === 'all' ? 'active' : '')} onClick={() => setFilterSection('all')}>
            All Sections ({sectionCounts.all})
          </button>
          <button className={'pill ' + (filterSection === 'picture' ? 'active' : '')} onClick={() => setFilterSection('picture')}>
            Picture Story ({sectionCounts.picture})
          </button>
          <button className={'pill ' + (filterSection === 'situation' ? 'active' : '')} onClick={() => setFilterSection('situation')}>
            Situation Response ({sectionCounts.situation})
          </button>
          <button className={'pill ' + (filterSection === 'word' ? 'active' : '')} onClick={() => setFilterSection('word')}>
            Word Association ({sectionCounts.word})
          </button>
          <button className={'pill ' + (filterSection === 'choice' ? 'active' : '')} onClick={() => setFilterSection('choice')}>
            Behavioral Choices ({sectionCounts.choice})
          </button>
        </div>

        <div className="pill-group" style={{ margin: '8px 0' }}>
          <button className={'pill ' + (filterAnswered === 'all' ? 'active' : '')} onClick={() => setFilterAnswered('all')}>All</button>
          <button className={'pill ' + (filterAnswered === 'answered' ? 'active' : '')} onClick={() => setFilterAnswered('answered')}>Answered</button>
          <button className={'pill ' + (filterAnswered === 'skipped' ? 'active' : '')} onClick={() => setFilterAnswered('skipped')}>Skipped</button>
        </div>
      </div>

      {loadingResponses && <p style={{ textAlign: 'center', margin: '30px 0' }}>Loading responses for this test attempt…</p>}
      {error && <p className="error">{error}</p>}

      {!loadingResponses && filteredResponses.length === 0 && (
        <div className="card empty-state" style={{ padding: '30px' }}>
          <p>No questions matched your filter criteria.</p>
        </div>
      )}

      {/* Question Response Cards */}
      {!loadingResponses && filteredResponses.map((r, idx) => {
        const q = r.questionId;
        const isChoice = q?.section === 'choice';
        const sectionTitle = sections.find(s => s[0] === q?.section)?.[1] || q?.section;

        return (
          <article className="test-response-item" key={r._id || idx}>
            <div className="response-top-bar">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge badge-info">{sectionTitle}</span>
                <span className="fine" style={{ fontWeight: 700 }}>Question #{idx + 1}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="fine">⏱ {r.responseTime || 0}s response time</span>
                {r.answered ? (
                  <span className="badge badge-success">✓ Answered</span>
                ) : (
                  <span className="badge badge-warning">Skipped</span>
                )}
              </div>
            </div>

            {q?.image && (
              <img className="response-prompt-img" src={q.image} alt="Prompt image" />
            )}

            <h3 className="response-question-prompt">{q?.prompt}</h3>

            {/* If Choice Question: show what they opted or chose */}
            {isChoice ? (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)', margin: '14px 0 8px' }}>
                  Options &amp; Your Selection:
                </div>
                <div className="choice-options-review">
                  {q?.options?.map((opt, optIdx) => {
                    const isChosen = r.selectedOption === optIdx;
                    return (
                      <div key={optIdx} className={'choice-review-item ' + (isChosen ? 'is-chosen' : 'is-unchosen')}>
                        <span className="choice-tag">
                          {isChosen ? '✓ Your Selection' : `Option ${optIdx + 1}`}
                        </span>
                        <p className="choice-text">{opt.text}</p>
                      </div>
                    );
                  })}
                </div>
                {!Number.isInteger(r.selectedOption) && (
                  <div className="skipped-alert">
                    ⚠️ You did not select an option for this question (skipped).
                  </div>
                )}
              </div>
            ) : (
              /* If Written Open Response: show what they wrote */
              <div>
                {r.responseText && r.responseText.trim() ? (
                  <div className="written-response-box">
                    <div className="box-label">
                      <span>{q?.section === 'picture' ? 'Your Written Story' : q?.section === 'word' ? 'Your Word Sentence / Association' : 'Your Written Response'}</span>
                      <small>{r.responseText.trim().split(/\s+/).length} words</small>
                    </div>
                    <p className="box-content">{r.responseText}</p>
                  </div>
                ) : (
                  <div className="skipped-alert">
                    ⚠️ You did not write a response for this item (skipped).
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('pxUser') || '{}');
  const id = localStorage.getItem('pxAssessment');
  const [status, setStatus] = useState('Loading your assessment…');
  const [err, setErr] = useState('');
  const [starting, setStarting] = useState(false);
  const [hash, navigateHash] = useHash();

  useEffect(() => {
    if (id) {
      api('/api/assessments/' + id)
        .then(a => setStatus(a.status === 'completed' ? 'Your assessment is complete.' : 'Your assessment is ready when you are.'))
        .catch(e => setErr(e.message));
    } else {
      setErr('No assessment is assigned to this account yet.');
    }
  }, [id]);

  async function startAnother() {
    setStarting(true);
    setErr('');
    try {
      const a = await api('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.candidateId })
      });
      localStorage.setItem('pxAssessment', a._id);
      go('/instructions');
    } catch (e) {
      setErr(e.message);
      setStarting(false);
    }
  }

  const complete = status.includes('complete');
  const tab = hash || 'dashboard';

  return (
    <Guard role="candidate">
      <Header />
      <main className="narrow card" style={{ maxWidth: tab === 'history' ? '1020px' : '820px' }}>
        <TabNav role="candidate" active={tab} />

        {tab === 'profile' ? (
          <>
            <p className="eyebrow">PROFILE</p>
            <h1>{user.name}</h1>
            <p className="fine">Candidate account</p>
            <div className="stats">
              <div><b>{user.email}</b><small>Email</small></div>
              <div><b>{user.candidateId || '—'}</b><small>Candidate ID</small></div>
            </div>
          </>
        ) : tab === 'history' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>TEST HISTORY &amp; RESPONSES</p>
                <h1>Previous Test Responses</h1>
                <p className="fine">Inspect all your submitted responses: review what you wrote in stories/situations and what you opted in behavioral choices.</p>
              </div>
            </div>
            <CandidateHistory />
          </>
        ) : (
          <>
            <p className="eyebrow">CANDIDATE DASHBOARD</p>
            <h1>Welcome, {user.name}</h1>
            <p>{status}</p>

            {complete && (
              <div className="alert-success" style={{ margin: '20px 0' }}>
                <div>
                  <strong>You have completed test attempts!</strong>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>Review your previous answers, written stories, and selected choices anytime.</div>
                </div>
                <button type="button" onClick={() => navigateHash('history')}>
                  View Previous Responses →
                </button>
              </div>
            )}

            <h2>Timed sections</h2>
            <div className="timing-list">
              {sections.map(s => (
                <div key={s[0]}>
                  <b>{s[1]}</b>
                  <span>{Math.floor(s[2] / 60)} minutes</span>
                </div>
              ))}
            </div>
            <p className="fine">Response time is context only and does not affect scores.</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
              {complete ? (
                <>
                  <button className="primary" onClick={startAnother} disabled={starting}>
                    {starting ? 'Preparing another test…' : 'Start another test'}
                  </button>
                  <button className="secondary" onClick={() => navigateHash('history')}>
                    View Previous Responses
                  </button>
                </>
              ) : (
                <a className="primary button" href="/instructions">Start assessment</a>
              )}
            </div>
          </>
        )}
        <p className="error">{err}</p>
      </main>
    </Guard>
  );
}

function Instructions() {
  return (
    <Guard role="candidate">
      <Header />
      <main className="narrow card">
        <p className="eyebrow">BEFORE YOU BEGIN</p>
        <h1>Assessment instructions</h1>
        <p>This is an educational behavioral competency exercise, not a diagnostic or medical assessment.</p>
        <ul>
          <li>There are four timed sections: picture stories, situations, word associations, and behavioral choices.</li>
          <li>Answer in your own words. You may skip any item.</li>
          <li>Response time is context only. Faster answers do not earn higher scores.</li>
          <li>Open responses are reviewed by a human evaluator.</li>
        </ul>
        <button className="primary" onClick={() => go('/assessment')}>Start assessment</button>
      </main>
    </Guard>
  );
}

function Assessment() {
  const candidate = localStorage.getItem('pxCandidate');
  const assessment = localStorage.getItem('pxAssessment');
  const [si, setSi] = useState(0);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selected, setSelected] = useState(null);
  const [remaining, setRemaining] = useState(sections[0][2]);
  const [error, setError] = useState('');
  const [wordRemaining, setWordRemaining] = useState(15);
  const [storyPhase, setStoryPhase] = useState('view');
  const [storyRemaining, setStoryRemaining] = useState(60);
  const [busyState, setBusyState] = useState(false);

  const section = sections[si];
  const question = items[idx];
  const busy = useRef(false);
  const questionStarted = useRef(Date.now());
  const drafts = useRef([]);
  const sectionRecords = useRef([]);

  useEffect(() => {
    if (!token() || localStorage.getItem('pxRole') !== 'candidate' || !candidate || !assessment) {
      go('/');
      return;
    }
    api('/api/questions?section=' + section[0])
      .then(d => {
        if (!d.length) throw Error('No questions found. Please ask administrator to seed question bank.');
        setItems(d);
        if (section[0] === 'picture') setRemaining(d.length * 300);
      })
      .catch(e => setError(e.message));
  }, [si]);

  useEffect(() => {
    const timer = setInterval(() => setRemaining(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [si]);

  useEffect(() => {
    if (section[0] !== 'word' || !question) return;
    setWordRemaining(15);
    const timer = setInterval(() => setWordRemaining(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [section[0], question?._id]);

  useEffect(() => {
    if (section[0] === 'word' && wordRemaining === 0 && question) advance(!answer.trim());
  }, [wordRemaining, question, answer]);

  useEffect(() => {
    if (section[0] !== 'picture' || !question) return;
    setStoryPhase('view');
    setStoryRemaining(60);
    const timer = setInterval(() => setStoryRemaining(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [section[0], question?._id]);

  useEffect(() => {
    if (section[0] !== 'picture' || storyRemaining !== 0 || !question) return;
    if (storyPhase === 'view') {
      setStoryPhase('write');
      setStoryRemaining(240);
      questionStarted.current = Date.now();
    } else {
      advance(!answer.trim());
    }
  }, [storyRemaining, storyPhase, question, answer]);

  useEffect(() => {
    if (remaining === 0 && section[0] !== 'word' && section[0] !== 'picture' && question) advance(true);
  }, [remaining, question]);

  async function advance(skip = false) {
    if (!question || busy.current) return;
    busy.current = true;
    setBusyState(true);
    const entry = {
      questionId: question._id,
      sequence: sectionRecords.current.length * 1000 + idx,
      responseText: answer,
      selectedOption: selected,
      responseTime: Math.round((Date.now() - questionStarted.current) / 1000),
      skipped: skip
    };
    const existing = drafts.current.findIndex(x => x.questionId === entry.questionId);
    if (existing >= 0) drafts.current[existing] = entry;
    else drafts.current.push(entry);

    setError('');
    if (idx + 1 < items.length) {
      setIdx(idx + 1);
      setAnswer('');
      setSelected(null);
      setWordRemaining(15);
      questionStarted.current = Date.now();
      busy.current = false;
      setBusyState(false);
      return;
    }
    const duration = sections[si][2] - remaining;
    const record = sectionRecords.current.find(x => x.section === section[0]);
    if (record) record.duration = duration;
    else sectionRecords.current.push({ section: section[0], duration });

    if (si + 1 < sections.length) {
      setSi(si + 1);
      setItems([]);
      setIdx(0);
      setAnswer('');
      setSelected(null);
      setRemaining(sections[si + 1][2]);
      questionStarted.current = Date.now();
      busy.current = false;
      setBusyState(false);
      return;
    }
    try {
      await api(`/api/assessments/${assessment}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: drafts.current, sections: sectionRecords.current })
      });
      go('/complete');
    } catch (e) {
      setError(e.message);
      busy.current = false;
      setBusyState(false);
    }
  }

  async function exitTest() {
    if (busy.current) return;
    if (!window.confirm('Exit this test? Your answers from this attempt will be discarded.')) return;
    setError('');
    setBusyState(true);
    try {
      const d = await api(`/api/assessments/${assessment}/exit`, { method: 'POST' });
      localStorage.setItem('pxAssessment', d.assessmentId);
      go('/dashboard');
    } catch (e) {
      setError(e.message);
      setBusyState(false);
    }
  }

  return (
    <Guard role="candidate">
      <Header />
      <main className="narrow card question">
        <div className="sectionhead">
          <p className="eyebrow">{section[1]}</p>
          <span className="clock">
            {String(Math.floor((section[0] === 'picture' ? storyRemaining : section[0] === 'word' ? wordRemaining : remaining) / 60)).padStart(2, '0')}:
            {String((section[0] === 'picture' ? storyRemaining : section[0] === 'word' ? wordRemaining : remaining) % 60).padStart(2, '0')}
          </span>
        </div>
        <button className="secondary" onClick={exitTest} disabled={busyState}>Exit test</button>
        <p className="question-count">{items.length ? `Question ${idx + 1} of ${items.length}` : 'Loading questions…'}</p>
        {items.length > 0 && <div className="progress"><i style={{ width: `${((idx + 1) / items.length) * 100}%` }} /></div>}
        {section[0] === 'picture' && <p className="fine">{storyPhase === 'view' ? 'Study the picture. It disappears when this minute ends.' : 'The picture is hidden. Write your story before time runs out.'}</p>}
        {question && (
          <>
            {section[0] === 'picture' && storyPhase === 'view' && question.image && (
              <img className="picture story-picture" src={question.image} alt="Blurred story prompt" />
            )}
            {section[0] !== 'picture' && <h1>{question.prompt}</h1>}
            {question.image && section[0] !== 'picture' && (
              <img className="picture" src={question.image} alt="Assessment prompt" />
            )}
            {section[0] === 'choice' ? (
              <div className="options">
                {question.options.map((o, i) => (
                  <button key={i} className={'option ' + (selected === i ? 'selected' : '')} onClick={() => setSelected(i)}>
                    {o.text}
                  </button>
                ))}
              </div>
            ) : section[0] === 'picture' ? (
              storyPhase === 'write' ? (
                <label className="story-answer">Your story
                  <textarea rows={8} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write a short story about what you saw…" />
                </label>
              ) : null
            ) : (
              <textarea rows={section[0] === 'word' ? 2 : 6} value={answer} onChange={e => setAnswer(e.target.value)} placeholder={section[0] === 'word' ? 'Write your first sentence using this word…' : 'Write your response…'} />
            )}
            {section[0] === 'picture' && (
              <div className="actions">
                <button className="secondary" onClick={() => advance(true)} disabled={busyState}>Skip story</button>
                {storyPhase === 'write' && <button className="primary" onClick={() => advance(false)} disabled={busyState}>Next story</button>}
              </div>
            )}
            {section[0] !== 'picture' && (
              <div className="actions">
                <button className="secondary" onClick={() => advance(true)} disabled={busyState}>Skip</button>
                <button className="primary" onClick={() => advance(false)} disabled={busyState}>Next</button>
              </div>
            )}
          </>
        )}
        <p className="error">{error}</p>
      </main>
    </Guard>
  );
}

function Complete() {
  return (
    <Guard role="candidate">
      <Header />
      <main className="narrow card center">
        <h1>Assessment complete</h1>
        <p>Your responses have been saved and are ready for evaluator review.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
          <a className="primary button" href="/dashboard#history">View Your Responses</a>
          <a className="secondary button" href="/dashboard">Back to dashboard</a>
        </div>
      </main>
    </Guard>
  );
}

/* Evaluator Portal with Dedicated "Evaluated" Section */
function Evaluator() {
  const [list, setList] = useState([]);
  const [evaluatedList, setEvaluatedList] = useState([]);
  const [candidate, setCandidate] = useState(null);
  const [result, setResult] = useState(null);
  const [attemptId, setAttemptId] = useState('');
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [selectedEvaluated, setSelectedEvaluated] = useState(null);
  const [showEvaluatedResponses, setShowEvaluatedResponses] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState('all');
  const [hash, navigateHash] = useHash();

  const tab = hash || 'candidates';

  // Load all candidates and all evaluated test attempts
  const refreshEvaluated = () => {
    api('/api/evaluations/evaluated')
      .then(data => {
        setEvaluatedList(data);
        if (data.length > 0) {
          setSelectedEvaluated(prev => prev ? data.find(x => x.assessmentId === prev.assessmentId) || data[0] : data[0]);
        }
      })
      .catch(e => console.error('Failed to load evaluated tests:', e));
  };

  useEffect(() => {
    api('/api/candidates')
      .then(setList)
      .catch(e => setError(e.message));
    refreshEvaluated();
  }, []);

  async function openCandidate(c) {
    setCandidate(c);
    setResult(null);
    setError('');
    setSaveSuccess('');
    try {
      const d = await api('/api/results/' + c._id);
      setResult(d);
      setAttemptId(String(d.assessment._id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function chooseAttempt(id) {
    setAttemptId(id);
    setError('');
    setSaveSuccess('');
    try {
      setResult(await api('/api/results/' + candidate._id + '?assessmentId=' + id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveSectionRating(e, section) {
    e.preventDefault();
    setSaveSuccess('');
    setError('');
    const f = new FormData(e.currentTarget);
    const scores = {};
    for (const [d, v] of f.entries()) {
      if (d !== 'notes' && v !== '' && !isNaN(v)) scores[d] = Number(v);
    }
    const sectionName = sections.find(s => s[0] === section)?.[1] || section;
    try {
      await api('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: result.assessment._id,
          candidateId: candidate._id,
          section,
          evaluatorScores: scores,
          notes: f.get('notes')
        })
      });
      setSaveSuccess(`✓ Evaluation saved for ${sectionName}! This test has been recorded in the Evaluated section.`);
      refreshEvaluated();
      // Reload result data to refresh the ratings
      const updated = await api('/api/results/' + candidate._id + '?assessmentId=' + attemptId);
      setResult(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  // Check if candidate has evaluated assessments
  const isCandidateEvaluated = (cId) => {
    return evaluatedList.some(e => String(e.candidate?._id) === String(cId));
  };

  const filteredCandidates = list.filter(c => {
    const isEval = isCandidateEvaluated(c._id);
    if (sidebarFilter === 'evaluated') return isEval;
    if (sidebarFilter === 'needs_evaluation') return !isEval;
    return true;
  });

  return (
    <Guard role="evaluator">
      <Header />
      <div style={{ maxWidth: '1360px', margin: '20px auto 0', padding: '0 20px' }}>
        <TabNav role="evaluator" active={tab} />
      </div>

      {/* 1. DEDICATED EVALUATED CANDIDATES SECTION */}
      {tab === 'evaluated' && (
        <main className="narrow card" style={{ maxWidth: '1320px', margin: '20px auto', padding: '32px' }}>
          <div className="evaluated-view-header">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>EVALUATOR SECTION</p>
              <h1 style={{ margin: '8px 0 12px' }}>Evaluated Candidates &amp; Tests</h1>
              <p className="lead" style={{ margin: 0 }}>
                Candidates whose assessment tests have been rated with evaluation scores and feedback saved.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="badge badge-evaluated" style={{ fontSize: '13px', padding: '8px 14px' }}>
                ✓ {evaluatedList.length} Tests Evaluated
              </span>
              <button className="secondary" onClick={() => navigateHash('candidates')}>
                Review Pending Candidates
              </button>
            </div>
          </div>

          {evaluatedList.length === 0 ? (
            <div className="empty-state">
              <p className="eyebrow">NO EVALUATIONS YET</p>
              <h3>No Evaluated Candidates Found</h3>
              <p>Once you score candidates' test responses in the review section, their evaluated tests, scores, and feedback will automatically appear in this section.</p>
              <button className="primary" onClick={() => navigateHash('candidates')}>Go to Review Section</button>
            </div>
          ) : (
            <>
              {/* Evaluated Candidates Grid */}
              <div className="evaluated-grid">
                {evaluatedList.map(item => {
                  const isSelected = selectedEvaluated?.assessmentId === item.assessmentId;
                  const ratedCount = item.sections?.length || 0;
                  const allScores = (item.evaluations || []).flatMap(e => Object.values(e.evaluatorScores || {}));
                  const avgScore = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : null;

                  return (
                    <article
                      key={item.assessmentId}
                      className={'evaluated-card ' + (isSelected ? 'active' : '')}
                      onClick={() => { setSelectedEvaluated(item); setShowEvaluatedResponses(false); }}
                    >
                      <div>
                        <div className="evaluated-card-top">
                          <div>
                            <h3>{item.candidate?.name}</h3>
                            <div className="evaluated-card-meta">
                              Code: <strong>{item.candidate?.candidateCode}</strong>
                            </div>
                          </div>
                          <span className="badge badge-evaluated">
                            ✓ {ratedCount}/4 Rated
                          </span>
                        </div>

                        <div className="evaluated-section-badges">
                          {sections.map(([secKey, secTitle]) => {
                            const isSecRated = item.sections?.includes(secKey);
                            return (
                              <span
                                key={secKey}
                                className={'badge ' + (isSecRated ? 'badge-evaluated' : 'badge-neutral')}
                                style={{ fontSize: '10px', padding: '3px 8px' }}
                              >
                                {isSecRated ? '✓ ' : ''}{secTitle.split(' ')[0]}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="evaluated-card-footer">
                        <div>
                          <small className="fine">
                            {avgScore ? <span>Avg Rating: <strong style={{ color: 'var(--blue)', fontSize: '14px' }}>{avgScore}/5</strong></span> : 'Scores recorded'}
                          </small>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            Updated {new Date(item.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button className="secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                          {isSelected ? 'Viewing' : 'Inspect'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Selected Evaluated Details Scorecard */}
              {selectedEvaluated && (
                <section className="evaluation-detail-box">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderBottom: '1.5px solid #edf2f9', paddingBottom: '20px', marginBottom: '24px' }}>
                    <div>
                      <span className="badge badge-evaluated" style={{ marginBottom: '8px' }}>✓ Evaluated Test Record</span>
                      <h2 style={{ margin: '4px 0 8px', fontSize: '26px' }}>{selectedEvaluated.candidate?.name}</h2>
                      <div className="fine" style={{ fontSize: '14px' }}>
                        Candidate Code: <strong>{selectedEvaluated.candidate?.candidateCode}</strong> · Completed: {new Date(selectedEvaluated.assessment?.completedAt || selectedEvaluated.assessment?.startedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        className="secondary"
                        onClick={() => setShowEvaluatedResponses(!showEvaluatedResponses)}
                      >
                        {showEvaluatedResponses ? 'Hide Test Responses' : 'View Candidate Test Responses'}
                      </button>
                      <button
                        className="primary"
                        onClick={() => {
                          // Jump directly to candidate review mode
                          const cand = list.find(c => c._id === selectedEvaluated.candidate?._id);
                          if (cand) openCandidate(cand);
                          navigateHash('candidates');
                        }}
                      >
                        Edit / Update Scores →
                      </button>
                    </div>
                  </div>

                  {/* Section-by-Section Evaluator Ratings */}
                  <h3 style={{ fontSize: '19px', marginBottom: '14px' }}>Saved Section Evaluation Scores &amp; Notes</h3>
                  <div style={{ display: 'grid', gap: '20px' }}>
                    {sections.map(([secKey, secTitle]) => {
                      const evalRecord = (selectedEvaluated.evaluations || []).find(e => e.section === secKey);
                      const scores = evalRecord?.evaluatorScores ? (evalRecord.evaluatorScores instanceof Map ? Object.fromEntries(evalRecord.evaluatorScores) : evalRecord.evaluatorScores) : {};
                      const scoreEntries = Object.entries(scores);

                      return (
                        <div key={secKey} className="eval-section-panel">
                          <div className="eval-section-panel-header">
                            <div>
                              <h3>{secTitle}</h3>
                            </div>
                            {evalRecord ? (
                              <span className="badge badge-evaluated">✓ Rated ({scoreEntries.length} Dimensions)</span>
                            ) : (
                              <span className="badge badge-warning">Not Yet Rated</span>
                            )}
                          </div>

                          {evalRecord ? (
                            <>
                              {scoreEntries.length > 0 && (
                                <div className="dimension-scores-grid">
                                  {scoreEntries.map(([dim, val]) => (
                                    <div key={dim} className="dimension-score-tile">
                                      <span className="dim-title">{names[dim] || dim}</span>
                                      <div className="dim-rating-row">
                                        <span className="dim-value">{val} / 5</span>
                                        <div className="score-stars">
                                          {[1, 2, 3, 4, 5].map(star => (
                                            <div
                                              key={star}
                                              className={'score-star ' + (star <= val ? 'filled' : '')}
                                              title={`${star} stars`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {evalRecord.notes ? (
                                <div className="eval-notes-display">
                                  <strong>Evaluator Notes:</strong>
                                  <p style={{ margin: 0 }}>{evalRecord.notes}</p>
                                </div>
                              ) : (
                                <div className="fine" style={{ marginTop: '10px' }}>No written notes recorded for this section.</div>
                              )}
                            </>
                          ) : (
                            <p className="fine" style={{ margin: '8px 0 0' }}>This section has not been rated yet.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Candidate Test Responses Toggle view */}
                  {showEvaluatedResponses && (
                    <div style={{ marginTop: '34px', borderTop: '2px dashed #e2eaf5', paddingTop: '26px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                        <div>
                          <p className="eyebrow" style={{ margin: 0 }}>CANDIDATE SUBMISSIONS</p>
                          <h3 style={{ margin: '4px 0' }}>Responses for this Evaluated Test</h3>
                        </div>
                        <button className="secondary" onClick={() => setShowEvaluatedResponses(false)}>Close Responses</button>
                      </div>

                      <CandidateTestResponsesView assessmentId={selectedEvaluated.assessmentId} />
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      )}

      {/* 2. REGULAR REVIEW CANDIDATES SECTION */}
      {tab === 'candidates' && (
        <main className="review">
          <aside className="card">
            <p className="eyebrow">EVALUATOR</p>
            <h1>Candidates</h1>

            {/* Filter pills */}
            <div className="pill-group" style={{ margin: '12px 0 16px' }}>
              <button className={'pill ' + (sidebarFilter === 'all' ? 'active' : '')} onClick={() => setSidebarFilter('all')}>
                All ({list.length})
              </button>
              <button className={'pill ' + (sidebarFilter === 'evaluated' ? 'active' : '')} onClick={() => setSidebarFilter('evaluated')}>
                Evaluated ({list.filter(c => isCandidateEvaluated(c._id)).length})
              </button>
              <button className={'pill ' + (sidebarFilter === 'needs_evaluation' ? 'active' : '')} onClick={() => setSidebarFilter('needs_evaluation')}>
                Needs Review
              </button>
            </div>

            {filteredCandidates.map(c => {
              const isEval = isCandidateEvaluated(c._id);
              const isSelected = candidate?._id === c._id;
              return (
                <button
                  key={c._id}
                  className={'sidebar-candidate-item ' + (isSelected ? 'selected' : '')}
                  onClick={() => openCandidate(c)}
                >
                  <div className="sidebar-candidate-header">
                    <b>{c.name}</b>
                    {isEval ? (
                      <span className="badge badge-evaluated" style={{ fontSize: '10px' }}>✓ Evaluated</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '10px' }}>Needs Review</span>
                    )}
                  </div>
                  <small style={{ color: 'var(--muted)' }}>{c.candidateCode}</small>
                </button>
              );
            })}
          </aside>

          <section className="card">
            <h1>{candidate ? `${candidate.name} · Assessment review` : 'Select a candidate'}</h1>

            {saveSuccess && (
              <div className="alert-success">
                <span>{saveSuccess}</span>
                <button type="button" onClick={() => navigateHash('evaluated')}>
                  View in Evaluated Section →
                </button>
              </div>
            )}

            {result && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
                  <label style={{ margin: 0 }}>
                    Assessment attempt
                    <select value={attemptId} onChange={e => chooseAttempt(e.target.value)}>
                      {result.attempts.map((a, i) => (
                        <option key={a._id} value={a._id}>
                          Attempt {result.attempts.length - i} · {a.status} · {new Date(a.startedAt || a.createdAt).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <p style={{ margin: 0 }}>
                      {result.assessment.status === 'completed' ? 'Completed' : 'In progress'} · {result.dynamics.completion}% complete
                    </p>
                    {isCandidateEvaluated(candidate._id) && (
                      <button className="secondary" onClick={() => navigateHash('evaluated')} style={{ padding: '8px 14px', fontSize: '12px' }}>
                        View in Evaluated Section →
                      </button>
                    )}
                  </div>
                </div>

                {sections.map(([section, title]) => {
                  const items = result.responses.filter(x => x.questionId?.section === section);
                  if (!items.length) return null;
                  const dimensions = [...new Set(items.flatMap(x => x.questionId?.dimensions || []))];

                  // Check if there are existing saved evaluation scores/notes for this section
                  const savedEval = (result.evaluations || []).find(e => e.section === section);
                  const savedScores = savedEval?.evaluatorScores ? (savedEval.evaluatorScores instanceof Map ? Object.fromEntries(savedEval.evaluatorScores) : savedEval.evaluatorScores) : {};

                  return (
                    <section key={section} style={{ marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <h2>{title}</h2>
                        {savedEval && <span className="badge badge-evaluated">✓ Section Saved</span>}
                      </div>

                      <form className="rating" onSubmit={e => saveSectionRating(e, section)}>
                        <h4>Section evaluation {savedEval ? '(Saved - modify to update)' : ''}</h4>
                        {dimensions.map(d => {
                          const currentVal = savedScores[d] || '';
                          return (
                            <label key={d}>
                              {names[d] || d}
                              <select name={d} defaultValue={currentVal != null && currentVal !== '' ? currentVal : 0}>
                                {[0, 1, 2, 3, 4, 5].map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </label>
                          );
                        })}
                        <textarea
                          name="notes"
                          rows="3"
                          defaultValue={savedEval?.notes || ''}
                          placeholder={`Notes and evaluation context for ${title.toLowerCase()}…`}
                        />
                        <button className="primary">Save section evaluation</button>
                      </form>

                      <div style={{ marginTop: '16px' }}>
                        <h4 style={{ color: 'var(--muted)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.06em', margin: '14px 0 8px' }}>
                          Candidate Submissions for {title}
                        </h4>
                        {items.map((x, itemIdx) => (
                          <article className="response-card" key={x._id} style={{ padding: '22px 0', borderTop: '1px solid #e5ebf5' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className="badge badge-info">{title}</span>
                                <span className="fine" style={{ fontWeight: 700 }}>Question #{itemIdx + 1}</span>
                              </div>
                              <small className="fine">{x.answered ? `✓ Answered · ${x.responseTime || 0}s` : 'Skipped'}</small>
                            </div>

                            <h3 style={{ fontSize: '17px', margin: '8px 0 12px', lineHeight: 1.45 }}>{x.questionId?.prompt}</h3>

                            {/* Show Question Picture Prompt for Evaluator Reference */}
                            {x.questionId?.image && (
                              <div style={{ margin: '14px 0 18px', background: '#f5f8fd', padding: '16px 18px', borderRadius: '14px', border: '1.5px solid #d8e4f3' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📷 Question Picture Prompt (Reference):
                                  </span>
                                  <a href={x.questionId.image} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>
                                    View Full Picture ↗
                                  </a>
                                </div>
                                <img
                                  src={x.questionId.image}
                                  alt="Question scene picture prompt"
                                  style={{
                                    width: '100%',
                                    maxHeight: '340px',
                                    objectFit: 'contain',
                                    borderRadius: '10px',
                                    background: '#fff',
                                    border: '1px solid #e1eaf5',
                                    boxShadow: '0 4px 14px rgba(20,40,70,0.06)'
                                  }}
                                />
                              </div>
                            )}

                            {x.questionId?.section === 'choice' ? (
                              <div style={{ margin: '12px 0' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.05em', marginBottom: '8px' }}>
                                  Candidate Chosen Option:
                                </div>
                                <div className="choice-options-review">
                                  {x.questionId?.options?.map((opt, optIdx) => {
                                    const isChosen = x.selectedOption === optIdx;
                                    return (
                                      <div key={optIdx} className={'choice-review-item ' + (isChosen ? 'is-chosen' : 'is-unchosen')}>
                                        <span className="choice-tag">{isChosen ? '✓ Candidate Choice' : `Option ${optIdx + 1}`}</span>
                                        <p className="choice-text">{opt.text}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div style={{ margin: '12px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.05em' }}>
                                    {x.questionId?.section === 'picture' ? "Candidate's Written Story:" : "Candidate's Written Response:"}
                                  </span>
                                  {x.responseText && (
                                    <small className="fine">{x.responseText.trim().split(/\s+/).length} words</small>
                                  )}
                                </div>
                                {x.responseText ? (
                                  <div className="written-response-box" style={{ margin: '4px 0' }}>
                                    <p className="box-content">{x.responseText}</p>
                                  </div>
                                ) : (
                                  <div className="skipped-alert">Skipped — Candidate did not write an answer.</div>
                                )}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
            <p className="error">{error}</p>
          </section>
        </main>
      )}

      {/* 3. COMPETENCY SUMMARY SECTION */}
      {tab === 'summary' && (
        <main className="narrow card" style={{ maxWidth: '1080px', margin: '20px auto', padding: '32px' }}>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Evaluation Competency Summary</h1>
          <p className="lead">High-level synthesis across candidate behavioral assessments.</p>

          <div className="stats" style={{ margin: '24px 0' }}>
            <div><b>{list.length}</b><small>Total Candidates</small></div>
            <div><b>{evaluatedList.length}</b><small>Evaluated Tests</small></div>
            <div><b>{list.length - evaluatedList.length}</b><small>Pending Evaluation</small></div>
          </div>

          <h2>Recent Evaluated Assessments</h2>
          {evaluatedList.slice(0, 5).map(e => (
            <div key={e.assessmentId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#f8faff', border: '1px solid #e1e8f3', borderRadius: '12px', margin: '10px 0' }}>
              <div>
                <b>{e.candidate?.name}</b> <span className="fine">({e.candidate?.candidateCode})</span>
                <div className="fine">Evaluated on {new Date(e.updatedAt).toLocaleDateString()} · {e.sections?.length || 0}/4 sections rated</div>
              </div>
              <button className="secondary" onClick={() => { setSelectedEvaluated(e); navigateHash('evaluated'); }}>
                View in Evaluated Section
              </button>
            </div>
          ))}
        </main>
      )}
    </Guard>
  );
}

/* Helper Component: Render Candidate Responses inside Evaluator */
function CandidateTestResponsesView({ assessmentId }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assessmentId) return;
    setLoading(true);
    api(`/api/assessments/${assessmentId}/responses`)
      .then(setResponses)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) return <p>Loading candidate responses for this test…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!responses.length) return <p className="fine">No responses found for this test.</p>;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {responses.map((r, i) => {
        const q = r.questionId;
        const isChoice = q?.section === 'choice';
        return (
          <div key={r._id || i} style={{ background: '#fff', border: '1px solid #dce4f2', borderRadius: '14px', padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="badge badge-info">{q?.section}</span>
              <small className="fine">{r.answered ? `Answered in ${r.responseTime}s` : 'Skipped'}</small>
            </div>
            {q?.image && (
              <div style={{ margin: '12px 0 16px', background: '#f5f8fd', padding: '14px', borderRadius: '12px', border: '1px solid #dbe5f2' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>
                    📷 Question Picture Prompt (Reference):
                  </span>
                  <a href={q.image} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>
                    View Full Picture ↗
                  </a>
                </div>
                <img
                  src={q.image}
                  alt="Question prompt"
                  style={{
                    width: '100%',
                    maxHeight: '280px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    background: '#fff',
                    border: '1px solid #e2eaf5'
                  }}
                />
              </div>
            )}
            <h4 style={{ margin: '6px 0 12px' }}>{q?.prompt}</h4>
            {isChoice ? (
              <div className="choice-options-review">
                {q?.options?.map((opt, optIdx) => {
                  const isChosen = r.selectedOption === optIdx;
                  return (
                    <div key={optIdx} className={'choice-review-item ' + (isChosen ? 'is-chosen' : 'is-unchosen')}>
                      <span className="choice-tag">{isChosen ? '✓ Candidate Choice' : `Option ${optIdx + 1}`}</span>
                      <p className="choice-text">{opt.text}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                {r.responseText ? (
                  <div className="written-response-box">
                    <div className="box-label">Candidate Written Response</div>
                    <p className="box-content">{r.responseText}</p>
                  </div>
                ) : (
                  <div className="skipped-alert">Skipped — Candidate wrote no answer.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const path = location.pathname;
  return path === '/dashboard' ? <Dashboard /> :
    path === '/instructions' ? <Instructions /> :
    path === '/assessment' ? <Assessment /> :
    path === '/complete' ? <Complete /> :
    path === '/reviewer' ? <Evaluator /> :
    <Auth />;
}

createRoot(document.getElementById('root')).render(<App />);
