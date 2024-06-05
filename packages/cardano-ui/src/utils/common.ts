export function generateImgLink(link: string | string[]) {
  if (Array.isArray(link)) {
    const linkToString = link.join('')
    return link.find(l => l.includes('ipfs')) ? normalizeIpfsLink(linkToString) : linkToString
  }
  return normalizeIpfsLink(link)
}

export function normalizeIpfsLink(link: string) {
  return `https://ipfs.io/ipfs/${String(link).replace('ipfs://', '')}`
}

export function cardanoExplorerLink(mint: string, direction = 'token') {
  return `https://cardanoscan.io/${direction}/${mint}`
}

export function cardanoMarketplaceLink(policy_id: string, direction = 'collection') {
  return `https://www.jpg.store/${direction}/${policy_id}`
}
