package com.frms.ops.security;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Entity
@Table(name = "frms_sec_directory_user")
class DirectoryUserEntity {
    @Id @Column(length = 50) public String id;
    public String username;
    @Column(name="full_name") public String fullName;
    public String role;
    public String branch;
    public String realm;
    @Column(name="eh_branch_unit") public String ehBranchUnit;
    public String status;
    public String maker;
    public String checker;
    @Column(name="created_at") public String createdAt;
    @Column(name="employee_id") public String employeeId;
    @Column(name="financial_txn_limit_bdt") public long financialTxnLimitBdt;
    @Column(name="ho_funding_limit_bdt") public long hoFundingLimitBdt;
    public String rights;
}

interface DirectoryUserRepository extends JpaRepository<DirectoryUserEntity, String> {
    List<DirectoryUserEntity> findAllByOrderByCreatedAtDesc();
}

@Entity
@Table(name = "frms_sec_employee")
class EmployeeRecordEntity {
    @Id @Column(length = 50) public String id;
    @Column(name="employee_no") public String employeeNo;
    @Column(name="full_name") public String fullName;
    public String department;
    public String designation;
    public String email;
    public String phone;
    @Column(name="linked_username") public String linkedUsername;
    public String status;
}

interface EmployeeRecordRepository extends JpaRepository<EmployeeRecordEntity, String> {}

@Entity
@Table(name = "frms_sec_audit")
class SecurityAuditEntity {
    @Id @Column(length = 50) public String id;
    public String at;
    public String actor;
    public String action;
    public String details;
}

interface SecurityAuditRepository extends JpaRepository<SecurityAuditEntity, String> {
    List<SecurityAuditEntity> findAllByOrderByAtDesc();
}

@Entity
@Table(name = "frms_sec_activity")
class UserActivityEntity {
    @Id @Column(length = 50) public String id;
    public String at;
    public String username;
    public String action;
    public String ip;
}

interface UserActivityRepository extends JpaRepository<UserActivityEntity, String> {
    List<UserActivityEntity> findAllByOrderByAtDesc();
}

@RestController
@RequestMapping("/security")
public class SecurityDirectoryController {

    private final DirectoryUserRepository userRepo;
    private final EmployeeRecordRepository empRepo;
    private final SecurityAuditRepository auditRepo;
    private final UserActivityRepository actRepo;

    public SecurityDirectoryController(DirectoryUserRepository userRepo, EmployeeRecordRepository empRepo, SecurityAuditRepository auditRepo, UserActivityRepository actRepo) {
        this.userRepo = userRepo;
        this.empRepo = empRepo;
        this.auditRepo = auditRepo;
        this.actRepo = actRepo;
        seed();
    }

    private void seed() {
        if(userRepo.count() == 0) {
            userRepo.save(createUser("USR-001","ho_admin","Head Office Admin","HO Admin","Head Office","ho","","Active","System",9999999,500000000,"dashboard,remittance,compliance,finance,reports,head_office,admin,security"));
            userRepo.save(createUser("USR-102","branch01_maker","Branch 01 Maker","Maker","Branch-01","branch","","Pending Approval","HO Admin",500000,0,"dashboard,remittance,reports"));
        }
        if(empRepo.count() == 0) {
            empRepo.save(createEmp("EMP-001","HO-0001","Head Office Admin","Operations","HO Administrator","ho.admin@example.com","+880-1700-000001","ho_admin"));
            empRepo.save(createEmp("EMP-102","BR-0102","Branch 01 Maker","Branch Ops","Senior Teller","branch01.maker@example.com","+880-1700-000102","branch01_maker"));
        }
    }

    private DirectoryUserEntity createUser(String id, String u, String f, String r, String b, String real, String eh, String s, String m, long fin, long ho, String rights) {
        var e = new DirectoryUserEntity(); e.id=id; e.username=u; e.fullName=f; e.role=r; e.branch=b; e.realm=real; e.ehBranchUnit=eh; e.status=s; e.maker=m; e.financialTxnLimitBdt=fin; e.hoFundingLimitBdt=ho; e.rights=rights; e.createdAt=nowTs(); return e;
    }

    private EmployeeRecordEntity createEmp(String id, String no, String f, String d, String des, String em, String p, String lu) {
        var e = new EmployeeRecordEntity(); e.id=id; e.employeeNo=no; e.fullName=f; e.department=d; e.designation=des; e.email=em; e.phone=p; e.linkedUsername=lu; e.status="Active"; return e;
    }

    private String nowTs() { return java.time.LocalDateTime.now().toString().replace('T', ' ').substring(0, 16); }

    @GetMapping("/users")
    public List<DirectoryUserEntity> getUsers() { return userRepo.findAllByOrderByCreatedAtDesc(); }

    @PostMapping("/users")
    public DirectoryUserEntity createUser(@RequestBody DirectoryUserEntity user) {
        user.id = "USR-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
        user.createdAt = nowTs();
        if(user.rights == null) user.rights = "";
        return userRepo.save(user);
    }

    @PatchMapping("/users/{id}")
    public DirectoryUserEntity updateUser(@PathVariable String id, @RequestBody DirectoryUserEntity patch) {
        var e = userRepo.findById(id).orElseThrow();
        if(patch.status != null) e.status = patch.status;
        if(patch.rights != null) e.rights = patch.rights;
        if(patch.financialTxnLimitBdt > 0 || patch.rights != null) { e.financialTxnLimitBdt = patch.financialTxnLimitBdt; e.hoFundingLimitBdt = patch.hoFundingLimitBdt; e.ehBranchUnit = patch.ehBranchUnit; }
        return userRepo.save(e);
    }

    @GetMapping("/employees")
    public List<EmployeeRecordEntity> getEmployees() { return empRepo.findAll(); }

    @PostMapping("/employees")
    public EmployeeRecordEntity createEmployee(@RequestBody EmployeeRecordEntity emp) {
        emp.id = "EMP-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
        return empRepo.save(emp);
    }

    @PatchMapping("/employees/{id}")
    public EmployeeRecordEntity updateEmployee(@PathVariable String id, @RequestBody EmployeeRecordEntity patch) {
        var e = empRepo.findById(id).orElseThrow();
        if(patch.status != null) e.status = patch.status;
        return empRepo.save(e);
    }

    @GetMapping("/audit")
    public List<SecurityAuditEntity> getAudit() { return auditRepo.findAllByOrderByAtDesc(); }

    @PostMapping("/audit")
    public void addAudit(@RequestBody SecurityAuditEntity log) {
        log.id = "AUD-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
        log.at = nowTs();
        auditRepo.save(log);
    }

    @GetMapping("/activity")
    public List<UserActivityEntity> getActivity() { return actRepo.findAllByOrderByAtDesc(); }

    @PostMapping("/activity")
    public void addActivity(@RequestBody UserActivityEntity act) {
        act.id = "ACT-" + UUID.randomUUID().toString().substring(0,8).toUpperCase();
        act.at = nowTs();
        act.ip = act.ip == null ? "127.0.0.1" : act.ip;
        actRepo.save(act);
    }
}
