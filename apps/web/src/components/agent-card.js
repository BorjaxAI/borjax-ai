export function renderAgentCard(agent, onClick, onRun) {
  const card = document.createElement('div');
  card.className = 'agent-list-item';
  card.dataset.agentId = agent.id;

  card.innerHTML = `
    <div class="agent-list-icon">🤖</div>
    <div style="flex:1; overflow:hidden;">
      <div class="agent-list-name truncate">${agent.name}</div>
      <div class="agent-list-role truncate">${agent.role}</div>
    </div>
  `;

  if (onClick) card.addEventListener('click', () => onClick(agent));

  return card;
}
