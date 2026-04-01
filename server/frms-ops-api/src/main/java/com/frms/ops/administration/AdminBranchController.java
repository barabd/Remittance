package com.frms.ops.administration;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Administration: Branch/Unit master data management (A.1.1).
 * Endpoints for creating, reading, updating branch master records.
 */
@RestController
@RequestMapping("/api/v1/administration")
public class AdminBranchController {

  private final AdminBranchRepository branchRepo;

  public AdminBranchController(AdminBranchRepository branchRepo) {
    this.branchRepo = branchRepo;
    seed();
  }

  private void seed() {
    if (branchRepo.count() == 0) {
      branchRepo.save(createBranch("BR-HO-001", "HO-Central", "Head Office Central", "HO", "Dhaka",
          "Active", "System", null));
      branchRepo.save(createBranch("BR-01-001", "Branch-01", "Gulshan Branch", "Branch", "Dhaka",
          "Active", "HO-Admin", "HO-Checker"));
      branchRepo.save(createBranch("BR-02-001", "Branch-02", "Mirpur Branch", "Branch", "Dhaka",
          "Active", "HO-Admin", "HO-Checker"));
      branchRepo.save(createBranch("BR-AG-001", "Agent-001", "Agent Eastern", "Agent", "Sylhet",
          "Pending Approval", "HO-Admin", null));
    }
  }

  private AdminBranchEntity createBranch(String code, String name, String displayName, String type,
      String district, String status, String maker, String checker) {
    var entity = new AdminBranchEntity();
    entity.setId("ADM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    entity.setBranchCode(code);
    entity.setBranchName(displayName);
    entity.setType(type);
    entity.setDistrict(district);
    entity.setStatus(status);
    entity.setMaker(maker);
    entity.setChecker(checker);
    entity.setCreatedAt(nowTs());
    return entity;
  }

  private String nowTs() {
    return LocalDateTime.now().toString().replace('T', ' ').substring(0, 16);
  }

  /**
   * GET /api/v1/administration/branches - List all branches
   */
  @GetMapping("/branches")
  public List<AdminBranchEntity> getBranches() {
    return branchRepo.findAllByOrderByCreatedAtDesc();
  }

  /**
   * POST /api/v1/administration/branches - Create new branch
   */
  @PostMapping("/branches")
  public AdminBranchEntity createBranch(@RequestBody AdminBranchEntity branch) {
    branch.setId("ADM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
    branch.setCreatedAt(nowTs());
    if (branch.getStatus() == null) {
      branch.setStatus("Pending Approval");
    }
    return branchRepo.save(branch);
  }

  /**
   * GET /api/v1/administration/branches/:id - Get single branch
   */
  @GetMapping("/branches/{id}")
  public AdminBranchEntity getBranch(@PathVariable String id) {
    return branchRepo.findById(id)
        .orElseThrow(() -> new RuntimeException("Branch not found: " + id));
  }

  /**
   * PATCH /api/v1/administration/branches/:id - Update branch status/fields
   */
  @PatchMapping("/branches/{id}")
  public AdminBranchEntity updateBranch(@PathVariable String id,
      @RequestBody AdminBranchEntity patch) {
    var entity = branchRepo.findById(id)
        .orElseThrow(() -> new RuntimeException("Branch not found: " + id));

    if (patch.getStatus() != null) {
      entity.setStatus(patch.getStatus());
    }
    if (patch.getChecker() != null) {
      entity.setChecker(patch.getChecker());
    }
    if (patch.getBranchName() != null) {
      entity.setBranchName(patch.getBranchName());
    }
    if (patch.getDistrict() != null) {
      entity.setDistrict(patch.getDistrict());
    }

    return branchRepo.save(entity);
  }

  /**
   * DELETE /api/v1/administration/branches/:id - Soft-delete (mark inactive)
   */
  @DeleteMapping("/branches/{id}")
  public void deleteBranch(@PathVariable String id) {
    var entity = branchRepo.findById(id)
        .orElseThrow(() -> new RuntimeException("Branch not found: " + id));
    entity.setStatus("Inactive");
    branchRepo.save(entity);
  }

  /**
   * GET /api/v1/administration/branches/active - List active branches only
   */
  @GetMapping("/branches/status/active")
  public List<AdminBranchEntity> getActiveBranches() {
    return branchRepo.findByStatus("Active");
  }
}
