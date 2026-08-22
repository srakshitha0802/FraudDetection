import { GraphNode, GraphEdge, FraudNetworkGraph } from './types.ts';
import { db } from './db.ts';

export function buildFraudNetworkGraph(highlightTransactionId?: string): FraudNetworkGraph {
  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  let edgeCounter = 1;

  // Add all Users
  for (const user of db.users.values()) {
    nodesMap.set(`user_${user.user_id}`, {
      id: `user_${user.user_id}`,
      label: `${user.name} (${user.user_id})`,
      type: 'USER',
      risk_level: user.account_status === 'FLAGGED' ? 'HIGH' : (user.account_status === 'SUSPENDED' ? 'CRITICAL' : 'LOW'),
      properties: {
        email: user.email,
        kyc: user.kyc_status,
        avg_amount: `₹${user.average_transaction_amount.toLocaleString('en-IN')}`,
        recent_pwd_reset: user.recent_password_reset,
      },
    });
  }

  // Add extra compromised/synthetic user nodes in network if present
  const extraUsers = [
    { id: 'user_U601_COMPROMISED', label: 'Vikrant S. (U601)', risk: 'CRITICAL' as const, note: 'Compromised via Phishing SMS' },
    { id: 'user_U702_VICTIM', label: 'Ananya D. (U702)', risk: 'HIGH' as const, note: 'Targeted in Fake Refund scam' },
  ];
  extraUsers.forEach(u => {
    if (!nodesMap.has(u.id)) {
      nodesMap.set(u.id, {
        id: u.id,
        label: u.label,
        type: 'USER',
        risk_level: u.risk,
        properties: { note: u.note },
      });
    }
  });

  // Add Devices
  for (const dev of db.devices.values()) {
    const devNodeId = `dev_${dev.device_id}`;
    nodesMap.set(devNodeId, {
      id: devNodeId,
      label: `${dev.device_model} (${dev.device_id})`,
      type: 'DEVICE',
      risk_level: dev.is_rooted_or_jailbroken || dev.is_emulator || dev.associated_users_count >= 2 ? 'CRITICAL' : (dev.reputation_score < 50 ? 'HIGH' : 'LOW'),
      properties: {
        os: dev.os,
        is_rooted: dev.is_rooted_or_jailbroken,
        is_emulator: dev.is_emulator,
        vpn: dev.is_vpn,
        reputation: `${dev.reputation_score}/100`,
        shared_accounts: dev.associated_users.length,
      },
    });

    // Add IP Node for device if present
    if (dev.ip_address) {
      const ipNodeId = `ip_${dev.ip_address.replace(/\./g, '_')}`;
      if (!nodesMap.has(ipNodeId)) {
        nodesMap.set(ipNodeId, {
          id: ipNodeId,
          label: `IP: ${dev.ip_address}`,
          type: 'IP',
          risk_level: dev.is_vpn ? 'HIGH' : 'LOW',
          properties: { ip: dev.ip_address, is_vpn: dev.is_vpn },
        });
      }

      // Link device to IP
      edges.push({
        id: `e_${edgeCounter++}`,
        source: devNodeId,
        target: ipNodeId,
        relationship: 'USED_IP',
        weight: 1,
        is_suspicious: dev.is_vpn || dev.reputation_score < 40,
      });
    }

    // Link users to device
    dev.associated_users.forEach(uid => {
      const uNodeId = `user_${uid}`;
      if (nodesMap.has(uNodeId)) {
        edges.push({
          id: `e_${edgeCounter++}`,
          source: uNodeId,
          target: devNodeId,
          relationship: 'USED_DEVICE',
          weight: dev.associated_users.length >= 2 ? 3 : 1,
          is_suspicious: dev.associated_users.length >= 2 || dev.is_rooted_or_jailbroken,
        });
      }
    });
  }

  // Add Beneficiaries
  for (const ben of db.beneficiaries.values()) {
    const benNodeId = `ben_${ben.beneficiary_id}`;
    nodesMap.set(benNodeId, {
      id: benNodeId,
      label: `${ben.name} (${ben.beneficiary_id})`,
      type: 'BENEFICIARY',
      risk_level: ben.is_flagged_mule || ben.associated_accounts_count >= 3 ? 'CRITICAL' : (ben.risk_score > 60 ? 'HIGH' : 'LOW'),
      properties: {
        vpa: ben.account_or_vpa,
        bank: ben.bank_name,
        is_mule: ben.is_flagged_mule,
        risk: `${ben.risk_score}/100`,
        fan_in_count: ben.associated_users.length,
      },
    });

    ben.associated_users.forEach(uid => {
      const uNodeId = `user_${uid}`;
      if (nodesMap.has(uNodeId)) {
        edges.push({
          id: `e_${edgeCounter++}`,
          source: uNodeId,
          target: benNodeId,
          relationship: 'SENT_TO_BENEFICIARY',
          weight: ben.is_flagged_mule ? 4 : 1,
          is_suspicious: ben.is_flagged_mule || ben.associated_users.length >= 2,
        });
      }
    });
  }

  // Link transactions
  for (const tx of db.transactions.values()) {
    const uNodeId = `user_${tx.user_id}`;
    const devNodeId = `dev_${tx.device_id}`;
    if (nodesMap.has(uNodeId) && nodesMap.has(devNodeId)) {
      const existing = edges.find(e => e.source === uNodeId && e.target === devNodeId);
      if (!existing) {
        edges.push({
          id: `e_${edgeCounter++}`,
          source: uNodeId,
          target: devNodeId,
          relationship: 'USED_DEVICE',
          weight: 1,
          is_suspicious: tx.risk_score ? tx.risk_score > 70 : false,
        });
      }
    }

    if (tx.beneficiary_id) {
      const benNodeId = `ben_${tx.beneficiary_id}`;
      if (!nodesMap.has(benNodeId)) {
        nodesMap.set(benNodeId, {
          id: benNodeId,
          label: tx.beneficiary_name || tx.beneficiary_id,
          type: 'BENEFICIARY',
          risk_level: tx.risk_score && tx.risk_score > 70 ? 'HIGH' : 'LOW',
          properties: { vpa: tx.beneficiary_account },
        });
      }
      const existingBenEdge = edges.find(e => e.source === uNodeId && e.target === benNodeId);
      if (!existingBenEdge) {
        edges.push({
          id: `e_${edgeCounter++}`,
          source: uNodeId,
          target: benNodeId,
          relationship: 'SENT_TO_BENEFICIARY',
          weight: 2,
          is_suspicious: (tx.risk_score || 0) > 70,
        });
      }
    }
  }

  const nodes = Array.from(nodesMap.values());
  const flaggedEntities = nodes.filter(n => n.risk_level === 'HIGH' || n.risk_level === 'CRITICAL').length;
  const suspiciousClusters = 2; // e.g. DEV778 cluster + Mule B992 syndicate

  return {
    nodes,
    edges,
    suspicious_clusters_count: suspiciousClusters,
    flagged_entities_count: flaggedEntities,
  };
}
