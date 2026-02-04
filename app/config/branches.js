/**
 * Military Branch Configuration
 * Includes branch names, IDs, and external logo URLs
 */

const BRANCH_CONFIG = [
  {
    id: 'Army',
    name: 'Army',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Logo_of_the_United_States_Army.svg/500px-Logo_of_the_United_States_Army.svg.png'
  },
  {
    id: 'Navy',
    name: 'Navy',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Emblem_of_the_United_States_Navy.svg/600px-Emblem_of_the_United_States_Navy.svg.png'
  },
  {
    id: 'Air Force',
    name: 'Air Force',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Military_service_mark_of_the_United_States_Air_Force.svg/640px-Military_service_mark_of_the_United_States_Air_Force.svg.png'
  },
  {
    id: 'Marines',
    name: 'Marines',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Emblem_of_the_United_States_Marine_Corps.svg/640px-Emblem_of_the_United_States_Marine_Corps.svg.png'
  },
  {
    id: 'Coast Guard',
    name: 'Coast Guard',
    logo: 'https://images.fineartamerica.com/images/artworkimages/medium/1/u-s-coast-guard-u-s-c-g-emblem-serge-averbukh-transparent.png'
  },
  {
    id: 'Space Force',
    name: 'Space Force',
    logo: 'https://i0.wp.com/spacenews.com/wp-content/uploads/2020/01/Screen-Shot-2020-01-25-at-6.36.23-AM.png?w=1059&ssl=1'
  },
  {
    id: 'National Guard',
    name: 'National Guard',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Seal_of_the_United_States_Army_National_Guard.svg/1200px-Seal_of_the_United_States_Army_National_Guard.svg.png'
  },
  {
    id: 'Merchant Marines',
    name: 'Merchant Marines',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Seal_of_the_United_States_Merchant_Marine.svg'
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
