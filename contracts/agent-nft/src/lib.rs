#![no_std]

//! ═══════════════════════════════════════════════════════════════
//! AGENT NFT CONTRACT — SEP-50 Compatible
//!
//! A Soroban NFT contract for The Velvet Ledger Bazaar.
//! Each token represents a game agent with on-chain metadata.
//!
//! Core functions:
//! - mint(owner, metadata) → token_id
//! - transfer(from, to, token_id)
//! - owner_of(token_id) → address
//! - token_uri(token_id) → metadata string
//! - balance_of(owner) → count
//! - get_agent(token_id) → AgentData
//! ═══════════════════════════════════════════════════════════════

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, String, Symbol, Vec,
    log,
};

// ── Storage keys ────────────────────────────────────────────

const ADMIN: Symbol = soroban_sdk::symbol_short!("ADMIN");
const COUNTER: Symbol = soroban_sdk::symbol_short!("COUNTER");

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Owner(u64),          // token_id → owner address
    Agent(u64),          // token_id → AgentData
    Balance(Address),    // owner → token count
    TokensOf(Address),   // owner → Vec<u64> of owned token IDs
}

// ── Agent metadata ──────────────────────────────────────────

#[derive(Clone, Debug)]
#[contracttype]
pub struct AgentData {
    pub name: String,
    pub title: String,
    pub emoji: String,
    pub specialty: String,
    pub haggle_bonus: i32,
    pub scout_bonus: i32,
    pub charm_bonus: i32,
    pub risk_factor: u32,     // stored as percentage (0-100)
    pub cost_per_mission: u32,
    pub missions_completed: u32,
    pub morale: u32,
    pub origin_brand: String,
    pub origin_day: u32,
}

// ── Contract ────────────────────────────────────────────────

#[contract]
pub struct AgentNFTContract;

#[contractimpl]
impl AgentNFTContract {
    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&COUNTER, &0u64);
    }

    /// Mint a new agent NFT. Returns the token ID.
    pub fn mint(env: Env, owner: Address, agent: AgentData) -> u64 {
        owner.require_auth();

        // Increment token counter
        let token_id: u64 = env.storage().instance().get(&COUNTER).unwrap_or(0) + 1;
        env.storage().instance().set(&COUNTER, &token_id);

        // Store owner
        env.storage().persistent().set(&DataKey::Owner(token_id), &owner);

        // Store agent data
        env.storage().persistent().set(&DataKey::Agent(token_id), &agent);

        // Update balance
        let balance: u64 = env.storage().persistent()
            .get(&DataKey::Balance(owner.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(&DataKey::Balance(owner.clone()), &(balance + 1));

        // Track owned tokens
        let mut tokens: Vec<u64> = env.storage().persistent()
            .get(&DataKey::TokensOf(owner.clone()))
            .unwrap_or(Vec::new(&env));
        tokens.push_back(token_id);
        env.storage().persistent().set(&DataKey::TokensOf(owner.clone()), &tokens);

        log!(&env, "Agent NFT minted: token_id={}, name={}", token_id, agent.name);

        token_id
    }

    /// Transfer an agent NFT to a new owner.
    pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) {
        from.require_auth();

        // Verify ownership
        let owner: Address = env.storage().persistent()
            .get(&DataKey::Owner(token_id))
            .expect("token does not exist");

        if owner != from {
            panic!("not the owner");
        }

        // Update owner
        env.storage().persistent().set(&DataKey::Owner(token_id), &to);

        // Update balances
        let from_balance: u64 = env.storage().persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(1);
        env.storage().persistent().set(&DataKey::Balance(from.clone()), &(from_balance - 1));

        let to_balance: u64 = env.storage().persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(&DataKey::Balance(to.clone()), &(to_balance + 1));

        // Update token lists
        let mut from_tokens: Vec<u64> = env.storage().persistent()
            .get(&DataKey::TokensOf(from.clone()))
            .unwrap_or(Vec::new(&env));
        if let Some(idx) = from_tokens.iter().position(|t| t == token_id) {
            from_tokens.remove(idx as u32);
        }
        env.storage().persistent().set(&DataKey::TokensOf(from), &from_tokens);

        let mut to_tokens: Vec<u64> = env.storage().persistent()
            .get(&DataKey::TokensOf(to.clone()))
            .unwrap_or(Vec::new(&env));
        to_tokens.push_back(token_id);
        env.storage().persistent().set(&DataKey::TokensOf(to), &to_tokens);
    }

    /// Get the owner of a token.
    pub fn owner_of(env: Env, token_id: u64) -> Address {
        env.storage().persistent()
            .get(&DataKey::Owner(token_id))
            .expect("token does not exist")
    }

    /// Get the agent data for a token.
    pub fn get_agent(env: Env, token_id: u64) -> AgentData {
        env.storage().persistent()
            .get(&DataKey::Agent(token_id))
            .expect("token does not exist")
    }

    /// Get the number of tokens owned by an address.
    pub fn balance_of(env: Env, owner: Address) -> u64 {
        env.storage().persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
    }

    /// Get all token IDs owned by an address.
    pub fn tokens_of(env: Env, owner: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::TokensOf(owner))
            .unwrap_or(Vec::new(&env))
    }

    /// Get the total number of minted tokens.
    pub fn total_supply(env: Env) -> u64 {
        env.storage().instance().get(&COUNTER).unwrap_or(0)
    }
}

// ── Tests ───────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_mint_and_query() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(AgentNFTContract, ());
        let client = AgentNFTContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let owner = Address::generate(&env);
        let agent = AgentData {
            name: String::from_str(&env, "Pepper Jack"),
            title: String::from_str(&env, "Senior Haggler"),
            emoji: String::from_str(&env, "pepper"),
            specialty: String::from_str(&env, "trade"),
            haggle_bonus: 25,
            scout_bonus: -5,
            charm_bonus: -10,
            risk_factor: 35,
            cost_per_mission: 8,
            missions_completed: 5,
            morale: 85,
            origin_brand: String::from_str(&env, "The Velvet Ledger"),
            origin_day: 3,
        };

        let token_id = client.mint(&owner, &agent);
        assert_eq!(token_id, 1);

        let retrieved = client.get_agent(&token_id);
        assert_eq!(retrieved.name, String::from_str(&env, "Pepper Jack"));
        assert_eq!(retrieved.haggle_bonus, 25);

        assert_eq!(client.owner_of(&token_id), owner);
        assert_eq!(client.balance_of(&owner), 1);
        assert_eq!(client.total_supply(), 1);
    }

    #[test]
    fn test_transfer() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(AgentNFTContract, ());
        let client = AgentNFTContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        let agent = AgentData {
            name: String::from_str(&env, "Crow Sigma"),
            title: String::from_str(&env, "Intel Op"),
            emoji: String::from_str(&env, "crow"),
            specialty: String::from_str(&env, "scout"),
            haggle_bonus: -5,
            scout_bonus: 15,
            charm_bonus: 5,
            risk_factor: 20,
            cost_per_mission: 4,
            missions_completed: 10,
            morale: 90,
            origin_brand: String::from_str(&env, "Test Brand"),
            origin_day: 7,
        };

        let token_id = client.mint(&alice, &agent);
        assert_eq!(client.owner_of(&token_id), alice.clone());

        client.transfer(&alice, &bob, &token_id);
        assert_eq!(client.owner_of(&token_id), bob.clone());
        assert_eq!(client.balance_of(&alice), 0);
        assert_eq!(client.balance_of(&bob), 1);
    }

    #[test]
    fn test_multiple_mints() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(AgentNFTContract, ());
        let client = AgentNFTContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let owner = Address::generate(&env);

        for i in 0..3 {
            let agent = AgentData {
                name: String::from_str(&env, "Agent"),
                title: String::from_str(&env, "Title"),
                emoji: String::from_str(&env, "x"),
                specialty: String::from_str(&env, "trade"),
                haggle_bonus: i as i32,
                scout_bonus: 0,
                charm_bonus: 0,
                risk_factor: 25,
                cost_per_mission: 8,
                missions_completed: 0,
                morale: 80,
                origin_brand: String::from_str(&env, "Test"),
                origin_day: 1,
            };
            client.mint(&owner, &agent);
        }

        assert_eq!(client.balance_of(&owner), 3);
        assert_eq!(client.total_supply(), 3);

        let tokens = client.tokens_of(&owner);
        assert_eq!(tokens.len(), 3);
    }
}
