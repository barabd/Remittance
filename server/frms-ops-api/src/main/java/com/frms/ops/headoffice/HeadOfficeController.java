package com.frms.ops.headoffice;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Entity
@Table(name = "frms_ho_role_policy")
class HoRolePolicyEntity {
    @Id @Column(length = 50) public String role;
    @Column(name = "maker_max_txn_bdt") public long makerMaxTxnBdt;
    @Column(name = "checker_req_bdt") public long checkerRequiredAboveBdt;
}

interface HoRolePolicyRepository extends JpaRepository<HoRolePolicyEntity, String> {}

@Entity
@Table(name = "frms_ho_branch_perm")
class HoBranchPermEntity {
    @Id @Column(name="branch_code", length = 50) public String branchCode;
    @Column(name="branch_name", length = 100) public String branchName;
    @Column(name="can_initiate_block") public boolean canInitiateExchangeHouseBlock;
}

interface HoBranchPermRepository extends JpaRepository<HoBranchPermEntity, String> {}

@Entity
@Table(name = "frms_ho_eh_block")
class HoEhBlockEntity {
    @Id @Column(name="agent_code", length = 50) public String agentCode;
    public boolean blocked;
}

interface HoEhBlockRepository extends JpaRepository<HoEhBlockEntity, String> {}

@RestController
@RequestMapping("/ho")
public class HeadOfficeController {

    private final HoRolePolicyRepository roleRepo;
    private final HoBranchPermRepository branchRepo;
    private final HoEhBlockRepository ehRepo;

    public HeadOfficeController(HoRolePolicyRepository roleRepo, HoBranchPermRepository branchRepo, HoEhBlockRepository ehRepo) {
        this.roleRepo = roleRepo;
        this.branchRepo = branchRepo;
        this.ehRepo = ehRepo;
        seed();
    }

    private void seed() {
        if(roleRepo.count() == 0) {
            roleRepo.saveAll(List.of(
                createRole("Maker", 500000, 500000),
                createRole("Checker", 9999999, 0),
                createRole("HO Admin", 9999999, 0),
                createRole("Finance", 2000000, 500000),
                createRole("Auditor", 0, 0)
            ));
            branchRepo.saveAll(List.of(
                createBranch("101", "Branch-01", true),
                createBranch("301", "Sub-Branch-03", true),
                createBranch("000", "Head Office", true)
            ));
        }
    }

    private HoRolePolicyEntity createRole(String r, long limit, long chk) {
        var e = new HoRolePolicyEntity(); e.role = r; e.makerMaxTxnBdt = limit; e.checkerRequiredAboveBdt = chk; return e;
    }
    private HoBranchPermEntity createBranch(String code, String name, boolean can) {
        var e = new HoBranchPermEntity(); e.branchCode = code; e.branchName = name; e.canInitiateExchangeHouseBlock = can; return e;
    }

    @GetMapping("/policies")
    public List<HoRolePolicyEntity> getPolicies() { return roleRepo.findAll(); }

    @PostMapping("/policies")
    public List<HoRolePolicyEntity> updatePolicies(@RequestBody List<HoRolePolicyEntity> policies) {
        return roleRepo.saveAll(policies);
    }

    @GetMapping("/branch-perms")
    public List<HoBranchPermEntity> getBranchPerms() { return branchRepo.findAll(); }

    @PostMapping("/branch-perms")
    public HoBranchPermEntity updateBranchPerm(@RequestBody HoBranchPermEntity p) { return branchRepo.save(p); }

    @GetMapping("/eh-blocks")
    public Map<String, Boolean> getEhBlocks() {
        return ehRepo.findAll().stream().collect(Collectors.toMap(e -> e.agentCode, e -> e.blocked));
    }

    @PostMapping("/eh-blocks/{agentCode}")
    public Map<String, Boolean> updateEhBlock(@PathVariable String agentCode, @RequestBody Map<String, Boolean> body) {
        var b = new HoEhBlockEntity();
        b.agentCode = agentCode;
        if(Boolean.TRUE.equals(body.get("blocked"))) {
            ehRepo.save(b);
        } else {
            ehRepo.deleteById(agentCode);
        }
        return getEhBlocks();
    }
}
