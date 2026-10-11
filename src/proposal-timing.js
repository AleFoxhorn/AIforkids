// A cooldown delays eligible proposals rather than discarding their timer.
export function proposalDelay(now,lastOperation,nextProposalAt,idle) {
  return Math.max(0,lastOperation+idle-now,nextProposalAt-now)+40;
}
