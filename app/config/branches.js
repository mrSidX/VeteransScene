/**
 * Military Branch Configuration
 * Includes branch names, IDs, and external logo URLs
 */

const BRANCH_CONFIG = [
  {
    id: 'Army',
    name: 'Army',
    logo: './assets/img/branches/Logo_of_the_United_States_Army.svg.png'
  },
  {
    id: 'Navy',
    name: 'Navy',
    logo: './assets/img/branches/Emblem_of_the_United_States_Navy.svg.png'
  },
  {
    id: 'Air Force',
    name: 'Air Force',
    logo: './assets/img/branches/U.S._Air_Force_service_mark.svg.png'
  },
  {
    id: 'Marines',
    name: 'Marines',
    logo: './assets/img/branches/Emblem_of_the_United_States_Marine_Corps.svg.png'
  },
  {
    id: 'Coast Guard',
    name: 'Coast Guard',
    logo: './assets/img/branches/u-s-coast-guard-u-s-c-g-emblem-serge-averbukh-transparent.png'
  },
  {
    id: 'Space Force',
    name: 'Space Force',
    logo: 'https://i0.wp.com/spacenews.com/wp-content/uploads/2020/01/Screen-Shot-2020-01-25-at-6.36.23-AM.png?w=1059&ssl=1'
  },
  {
    id: 'National Guard',
    name: 'National Guard',
    logo: './assets/img/branches/Seal_of_the_United_States_Army_National_Guard.svg.png'
  },
  {
    id: 'Merchant Marines',
    name: 'Merchant Marines',
    logo: './assets/img/branches/Seal_of_the_United_States_Merchant_Marine.svg'
  },
  {
    id: "Women's Army Corps",
    name: "Women's Army Corps",
    logo: './assets/img/womens_army_corps.webp'
  }
];

/**
 * Get branch logo by branch ID
 * @param {string} branchId - The branch ID
 * @returns {string} - Logo URL or empty string if not found
 */
function getBranchLogo(branchId) {
  const branch = BRANCH_CONFIG.find(b => b.id === branchId);
  return branch ? branch.logo : '';
}

/**
 * Get branch name by branch ID
 * @param {string} branchId - The branch ID
 * @returns {string} - Branch name or empty string if not found
 */
function getBranchName(branchId) {
  const branch = BRANCH_CONFIG.find(b => b.id === branchId);
  return branch ? branch.name : '';
}

/**
 * Get all valid branch IDs
 * @returns {string[]} - Array of valid branch IDs
 */
function getValidBranchIds() {
  return BRANCH_CONFIG.map(b => b.id);
}

export { BRANCH_CONFIG, getBranchLogo, getBranchName, getValidBranchIds };
